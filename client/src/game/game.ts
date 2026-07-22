import Phaser from 'phaser'
import {Poker} from './poker'
import {Rule} from './rule'
import {Protocol, Socket} from './net'
import {createPlay} from './player'

// 简单的观察者, 用于 UI 与状态解耦 (房间信息/倒计时/准备/抢地主)
class Observer {
    state: Record<string, any>
    subscribers: Record<string, Array<(val: any) => void>>

    constructor() {
        this.state = {}
        this.subscribers = {}
    }

    get(key: string): any {
        return this.state[key]
    }

    set(key: string, val: any) {
        const keys = key.split('.')
        if (keys.length === 1) {
            this.state[key] = val
        } else {
            if (!this.state[keys[0]]) this.state[keys[0]] = {}
            this.state[keys[0]][keys[1]] = val
            key = keys[0]
        }
        const newVal = this.state[key]
        const subscribers = this.subscribers
        if (subscribers.hasOwnProperty(key)) {
            subscribers[key].forEach(cb => cb && cb(newVal))
        }
    }

    subscribe(key: string, cb: (val: any) => void) {
        if (!this.subscribers.hasOwnProperty(key)) this.subscribers[key] = []
        this.subscribers[key].push(cb)
    }
}

const observer = new Observer()

class GameScene extends Phaser.Scene {
    players: any[]
    tablePoker: any[]
    tablePokerPic: Record<string, any>
    lastShotPlayer: any
    whoseTurn: number
    socket: Socket

    constructor() {
        super('GameScene')
        this.players = []
        this.tablePoker = []
        this.tablePokerPic = {}
        this.lastShotPlayer = null
        this.whoseTurn = 0
    }

    create() {
        Rule.RuleList = this.cache.json.get('rule')
        this.cameras.main.setBackgroundColor('#182d3b')

        window.playerInfo = window.playerInfo || {uid: 0, name: 'player'}
        observer.set('baseScore', 1)

        this.players = [createPlay(0, this), createPlay(1, this), createPlay(2, this)]
        this.players[0].updateInfo(window.playerInfo.uid, window.playerInfo.name)

        const protocol = window.location.protocol.startsWith('https') ? 'wss://' : 'ws://'
        const token = localStorage.getItem('token') || ''
        // 开发环境: 直接连接游戏服务器(8080), 不走 CRA proxy
        const wsHost = process.env.NODE_ENV === 'development' ? 'localhost:8080' : window.location.host
        const wsUrl = protocol + wsHost + '/ws?token=' + encodeURIComponent(token)
        console.log('WebSocket URL:', wsUrl)
        console.log('Token:', token ? 'exists' : 'missing')
        this.socket = new Socket(wsUrl)
        this.socket.connect(this.onopen.bind(this), this.onmessage.bind(this), this.onerror.bind(this))

        const width = this.scale.width
        const height = this.scale.height

        // 房间信息
        const titleBar = this.add.text(width / 2, 0, '房间号:0 底分:0 倍数:0', {
            font: '22px Arial', color: '#fff', align: 'center'
        })
        titleBar.setOrigin(0.5, 0)
        observer.subscribe('room', room => {
            titleBar.setText(`房间号:${room.id} 底分:${room.origin} 倍数:${room.multiple}`)
        })

        // 倒计时
        const countdown = this.add.text(width / 2, height / 2, '10', {
            font: '80px Arial', color: '#fff', align: 'center'
        })
        countdown.setOrigin(0.5)
        countdown.setVisible(false)
        observer.subscribe('countdown', timer => {
            countdown.setVisible(timer > 0)
            if (timer > 0) countdown.setText(String(timer))
        })

        // 准备按钮
        const ready = this.add.sprite(width / 2, height * 0.6, 'ready').setOrigin(0.5, 0).setInteractive()
        ready.on('pointerup', () => {
            this.send_message([Protocol.REQ_READY, {ready: 1}])
        })
        observer.subscribe('ready', isReady => {
            ready.setVisible(!isReady)
        })

        // 抢地主按钮
        const robGroup = this.add.group()
        const pass = this.add.sprite(width * 0.4, height * 0.6, 'ui', 'score_0.png').setOrigin(0.5, 0).setInteractive()
        pass.on('pointerup', () => {
            this.sound.add('f_score_0').play()
            this.send_message([Protocol.REQ_CALL_SCORE, {rob: 0}])
        })
        robGroup.add(pass)
        const rob = this.add.sprite(width * 0.6, height * 0.6, 'ui', 'score_1.png').setOrigin(0.5, 0).setInteractive()
        rob.on('pointerup', () => {
            this.sound.add('f_score_1').play()
            this.send_message([Protocol.REQ_CALL_SCORE, {rob: 1}])
        })
        robGroup.add(rob)
        robGroup.getChildren().forEach((c: any) => c.setVisible(false))
        observer.subscribe('rob', isRob => {
            robGroup.getChildren().forEach((c: any) => c.setVisible(isRob))
            if (isRob) observer.set('countdown', -1)
        })
    }

    onopen() {
        console.log('socket onopen')
        this.socket.send([Protocol.REQ_ROOM_LIST, {}])
        this.socket.send([Protocol.REQ_JOIN_ROOM, {room: -1, level: observer.get('baseScore') || 1}])
    }

    onerror() {
        console.log('socket onerror, try reconnect.')
        const protocol = window.location.protocol.startsWith('https') ? 'wss://' : 'ws://'
        const token = localStorage.getItem('token') || ''
        this.socket = new Socket(protocol + window.location.host + '/ws?token=' + encodeURIComponent(token))
        this.socket.connect(this.onopen.bind(this), this.onmessage.bind(this), this.onerror.bind(this))
    }

    send_message(request) {
        this.socket.send(request)
    }

    onmessage(message) {
        const code = message[0], packet = message[1]
        switch (code) {
            case Protocol.RSP_ROOM_LIST:
                console.log('room list', packet)
                break
            case Protocol.RSP_JOIN_ROOM: {
                observer.set('room', packet.room)
                const syncInfo = packet.players
                for (let i = 0; i < syncInfo.length; i++) {
                    if (syncInfo[i].uid === this.players[0].uid) {
                        const info1 = syncInfo[(i + 1) % 3]
                        const info2 = syncInfo[(i + 2) % 3]
                        this.players[1].updateInfo(info1.uid, info1.name)
                        this.players[2].updateInfo(info2.uid, info2.name)
                        break
                    }
                }
                break
            }
            case Protocol.RSP_READY:
                if (packet.uid === this.players[0].uid) observer.set('ready', true)
                break
            case Protocol.RSP_DEAL_POKER: {
                const playerId = packet.uid
                this.dealPoker(packet.pokers)
                this.whoseTurn = this.uidToSeat(playerId)
                this.startCallScore()
                break
            }
            case Protocol.RSP_CALL_SCORE: {
                const playerId = packet.uid
                const landlord = packet.landlord
                this.whoseTurn = this.uidToSeat(playerId)
                const hanzi = ['不抢', '抢地主']
                this.players[this.whoseTurn].say(hanzi[packet.rob])
                observer.set('rob', false)
                if (landlord === -1) {
                    this.whoseTurn = (this.whoseTurn + 1) % 3
                    this.startCallScore()
                } else {
                    this.whoseTurn = this.uidToSeat(landlord)
                    this.tablePoker[0] = packet.pokers[0]
                    this.tablePoker[1] = packet.pokers[1]
                    this.tablePoker[2] = packet.pokers[2]
                    this.players[this.whoseTurn].setLandlord()
                    this.showLastThreePoker()
                }
                observer.set('room.multiple', packet.multiple)
                break
            }
            case Protocol.RSP_SHOT_POKER:
                this.handleShotPoker(packet)
                observer.set('room.multiple', packet.multiple)
                break
            case Protocol.RSP_GAME_OVER: {
                const winner = packet.winner
                packet.players.forEach(player => {
                    const seat = this.uidToSeat(player.uid)
                    if (seat > 0) {
                        this.players[seat].replacePoker(player.pokers, 0)
                        this.players[seat].reDealPoker()
                    }
                })
                this.whoseTurn = this.uidToSeat(winner)
                const gameOver = () => {
                    alert(this.players[this.whoseTurn].isLandlord ? '地主赢' : '农民赢')
                    observer.set('ready', false)
                    this.cleanWorld()
                }
                this.time.delayedCall(2000, gameOver, [], this)
                break
            }
            case Protocol.RSP_LEAVE_ROOM:
                console.log('player leave', packet)
                break
            case Protocol.ERROR:
                console.warn('ERROR:', packet && packet.reason)
                break
            default:
                console.log('UNKNOWN PACKET:', message)
        }
    }

    uidToSeat(uid) {
        for (let i = 0; i < 3; i++) {
            if (uid === this.players[i].uid) return i
        }
        console.log('ERROR uidToSeat:' + uid)
        return -1
    }

    dealPoker(pokers) {
        // 底牌占位 (背面)
        const p = new Poker(this, 55, 55)
        this.tablePokerPic[55] = p

        for (let i = 0; i < 17; i++) {
            this.players[2].pokerInHand.push(55)
            this.players[1].pokerInHand.push(55)
            this.players[0].pokerInHand.push(pokers.pop())
        }

        this.players[0].dealPoker()
        this.players[1].dealPoker()
        this.players[2].dealPoker()
    }

    showLastThreePoker() {
        // 删除底牌占位
        if (this.tablePokerPic[55]) {
            this.tablePokerPic[55].destroy()
            delete this.tablePokerPic[55]
        }
        for (let i = 0; i < 3; i++) {
            const pokerId = this.tablePoker[i]
            const p = new Poker(this, pokerId, pokerId)
            this.tablePokerPic[pokerId] = p
            this.tweens.add({
                targets: p,
                x: this.scale.width / 2 + (i - 1) * 60,
                duration: 600,
                ease: 'Linear'
            })
        }
        this.time.delayedCall(1500, this.dealLastThreePoker, [], this)
    }

    dealLastThreePoker() {
        const turnPlayer = this.players[this.whoseTurn]

        for (let i = 0; i < 3; i++) {
            const pid = this.tablePoker[i]
            const poker = this.tablePokerPic[pid]
            turnPlayer.pokerInHand.push(pid)
            turnPlayer.pushAPoker(poker)
        }
        turnPlayer.sortPoker()
        if (this.whoseTurn === 0) {
            turnPlayer.arrangePoker()
            for (let i = 0; i < 3; i++) {
                const pid = this.tablePoker[i]
                const p = this.tablePokerPic[pid]
                const tween = this.tweens.add({
                    targets: p,
                    y: this.scale.height - Poker.PH * 0.8,
                    duration: 400,
                    ease: 'Linear'
                })
                tween.on('complete', () => {
                    this.tweens.add({
                        targets: p,
                        y: this.scale.height - Poker.PH / 2,
                        duration: 400,
                        delay: 400,
                        ease: 'Linear'
                    })
                })
            }
        } else {
            const first = turnPlayer.findAPoker(55)
            for (let i = 0; i < 3; i++) {
                const pid = this.tablePoker[i]
                const p = this.tablePokerPic[pid]
                p.setFrame(55 - 1)
                this.tweens.add({
                    targets: p,
                    x: first.x,
                    y: first.y,
                    duration: 200,
                    ease: 'Linear'
                })
            }
        }

        this.tablePoker = []
        this.lastShotPlayer = turnPlayer
        if (this.whoseTurn === 0) this.startPlay()
    }

    handleShotPoker(packet) {
        this.whoseTurn = this.uidToSeat(packet.uid)
        const turnPlayer = this.players[this.whoseTurn]
        const pokers = packet.pokers
        if (pokers.length === 0) {
            this.players[this.whoseTurn].say('不出')
        } else {
            const pokersPic = {}
            pokers.sort(Poker.comparePoker)
            const count = pokers.length
            const gap = Math.min((this.scale.width - Poker.PW * 2) / count, Poker.PW * 0.36)
            for (let i = 0; i < count; i++) {
                const p = turnPlayer.findAPoker(pokers[i])
                p.id = pokers[i]
                p.setFrame(pokers[i] - 1)
                this.children.bringToTop(p)
                this.tweens.add({
                    targets: p,
                    x: this.scale.width / 2 + (i - count / 2) * gap,
                    y: this.scale.height * 0.4,
                    duration: 500,
                    ease: 'Linear'
                })
                turnPlayer.removeAPoker(pokers[i])
                pokersPic[p.id] = p
            }

            for (let i = 0; i < this.tablePoker.length; i++) {
                const p = this.tablePokerPic[this.tablePoker[i]]
                if (p) p.destroy()
            }
            this.tablePoker = pokers
            this.tablePokerPic = pokersPic
            this.lastShotPlayer = turnPlayer
            turnPlayer.arrangePoker()
        }
        if (turnPlayer.pokerInHand.length > 0) {
            this.whoseTurn = (this.whoseTurn + 1) % 3
            if (this.whoseTurn === 0) {
                this.time.delayedCall(1000, this.startPlay, [], this)
            }
        }
    }

    startCallScore() {
        if (this.whoseTurn === 0) {
            observer.set('rob', true)
            this.startCountdown(20, () => {
                this.send_message([Protocol.REQ_CALL_SCORE, {rob: 0}])
            })
        }
    }

    startCountdown(seconds: number, onTimeout: () => void) {
        observer.set('countdown', seconds)
        const tick = () => {
            const current = observer.get('countdown')
            if (current > 0) {
                observer.set('countdown', current - 1)
                this.time.delayedCall(1000, tick)
            } else {
                onTimeout()
            }
        }
        this.time.delayedCall(1000, tick)
    }

    startPlay() {
        if (this.isLastShotPlayer()) {
            this.players[0].playPoker([])
        } else {
            this.players[0].playPoker(this.tablePoker)
        }
    }

    finishPlay(pokers) {
        this.send_message([Protocol.REQ_SHOT_POKER, {pokers}])
    }

    isLastShotPlayer() {
        return this.players[this.whoseTurn] === this.lastShotPlayer
    }

    cleanWorld() {
        this.players.forEach(player => {
            player.cleanPokers()
            player.uiHead.setFrame('icon_farmer.png')
        })
        for (let i = 0; i < this.tablePoker.length; i++) {
            const p = this.tablePokerPic[this.tablePoker[i]]
            if (p) p.destroy()
        }
        this.tablePoker = []
        this.tablePokerPic = {}
        this.lastShotPlayer = null
    }
}

export default GameScene
