import {Poker} from './poker'
import {Rule} from './rule'

// 座位 0 = 自己(底部), 1 = 右上, 2 = 左上
export const createPlay = function (seat: number, scene: any): Player | NetPlayer {
    const player = seat === 0 ? new Player(seat, scene) : new NetPlayer(seat, scene)
    const width = scene.scale.width
    const height = scene.scale.height
    const xy = [
        Poker.PW / 2, height - Poker.PH - 10,
        width - Poker.PW / 2, 94,
        Poker.PW / 2, 94
    ]
    player.initUI(xy[seat * 2], xy[seat * 2 + 1])
    if (seat === 0) {
        player.initShotLayer()
    } else if (seat === 1) {
        player.uiHead.setScale(-1, 1)
    }
    return player
}

class Player {
    uid: number
    seat: number
    game: any
    pokerInHand: number[]
    _pokerPic: Record<string, any>
    isLandlord: boolean
    hintPoker: number[]
    isDraging: boolean
    _lastDownPoker: any
    uiHead: any
    shotLayer: any
    lastTurnPoker: number[]

    constructor(seat: number, scene: any) {
        this.uid = seat
        this.seat = seat
        this.game = scene

        this.pokerInHand = []
        this._pokerPic = {}
        this.isLandlord = false

        this.hintPoker = []
        this.isDraging = false
        this._lastDownPoker = null
    }

    initUI(sx: number, sy: number) {
        this.uiHead = this.game.add.sprite(sx, sy, 'ui', 'icon_default.png')
        this.uiHead.setOrigin(0.5, 1)
    }

    updateInfo(uid: number, name: string) {
        this.uid = uid
        if (uid) {
            this.uiHead.setFrame('icon_farmer.png')
        } else {
            this.uiHead.setFrame('icon_default.png')
        }
    }

    cleanPokers() {
        const length = this.pokerInHand.length
        for (let i = 0; i < length; i++) {
            const p = this.findAPoker(this.pokerInHand[i])
            if (p) p.destroy()
        }
        this.pokerInHand = []
        this._pokerPic = {}
    }

    initShotLayer() {
        this.shotLayer = this.game.add.group()
        const sy = this.game.scale.height * 0.6

        const pass = this.game.add.sprite(0, sy, 'ui', 'pass.png').setOrigin(0.5, 0).setInteractive()
        pass.on('pointerup', () => this.onPass())
        this.shotLayer.add(pass)

        const hint = this.game.add.sprite(0, sy, 'ui', 'hint.png').setOrigin(0.5, 0).setInteractive()
        hint.on('pointerup', () => this.onHint())
        this.shotLayer.add(hint)

        const shot = this.game.add.sprite(0, sy, 'ui', 'shot.png').setOrigin(0.5, 0).setInteractive()
        shot.on('pointerup', () => this.onShot())
        this.shotLayer.add(shot)

        this.shotLayer.getChildren().forEach((c: any) => c.setVisible(false))

        // 拖动多选: 全局抬起结束拖动
        this.game.input.on('pointerup', () => {
            this.isDraging = false
        })
    }

    setLandlord() {
        this.isLandlord = true
        this.uiHead.setFrame('icon_landlord.png')
    }

    say(str: string) {
        const style = {font: '22px Arial', color: '#ffffff', align: 'center'}
        let sx = this.uiHead.x + this.uiHead.displayWidth / 2 + 10
        let sy = this.uiHead.y - this.uiHead.displayHeight * 0.5
        const text = this.game.add.text(sx, sy, str, style)
        if (this.uiHead.scaleX === -1) {
            text.x = text.x - text.width - 10
        }
        this.game.time.delayedCall(2000, () => text.destroy())
    }

    onInputDown(poker: any) {
        this.isDraging = true
        this._lastDownPoker = poker // 记录刚按下的牌, 防止 pointerdown 后立即触发的 pointerover 重复选中
        this.onSelectPoker(poker)
    }

    onInputUp() {
        this.isDraging = false
    }

    onInputOver(poker: any) {
        if (this.isDraging) {
            if (poker === this._lastDownPoker) {
                this._lastDownPoker = null
                return
            }
            this.onSelectPoker(poker)
        }
    }

    onSelectPoker(poker: any) {
        const index = this.hintPoker.indexOf(poker.id)
        if (index === -1) {
            poker.y = this.game.scale.height - Poker.PH * 0.8
            this.hintPoker.push(poker.id)
        } else {
            poker.y = this.game.scale.height - Poker.PH * 0.5
            this.hintPoker.splice(index, 1)
        }
    }

    onPass() {
        this.game.finishPlay([])
        this.pokerUnSelected(this.hintPoker)
        this.hintPoker = []
        this.shotLayer.getChildren().forEach((c: any) => c.setVisible(false))
    }

    onHint() {
        if (this.hintPoker.length === 0) {
            this.hintPoker = this.lastTurnPoker
        } else {
            this.pokerUnSelected(this.hintPoker)
            if (this.lastTurnPoker.length > 0 && !Poker.canCompare(this.hintPoker, this.lastTurnPoker)) {
                this.hintPoker = []
            }
        }
        const bigger = this.hint(this.hintPoker)
        if (bigger.length === 0) {
            if (this.hintPoker === this.lastTurnPoker) {
                this.say('没有能大过的牌')
            } else {
                this.pokerUnSelected(this.hintPoker)
            }
        } else {
            this.pokerSelected(bigger)
        }
        this.hintPoker = bigger
    }

    onShot() {
        if (this.hintPoker.length === 0) return
        const code = this.canPlay(this.game.isLastShotPlayer() ? [] : this.game.tablePoker, this.hintPoker)
        if (code) {
            this.say(code)
            return
        }
        this.game.finishPlay(this.hintPoker)
        this.hintPoker = []
        this.shotLayer.getChildren().forEach((c: any) => c.setVisible(false))
    }

    hint(lastTurnPoker: number[]): number[] {
        let cards
        const handCards = Poker.toCards(this.pokerInHand)
        if (lastTurnPoker.length === 0) {
            cards = Rule.bestShot(handCards)
        } else {
            cards = Rule.cardsAbove(handCards, Poker.toCards(lastTurnPoker))
        }
        return Poker.toPokers(this.pokerInHand, cards)
    }

    canPlay(lastTurnPoker: number[], shotPoker: number[]): string {
        const cardsA = Poker.toCards(shotPoker)
        const valueA = Rule.cardsValue(cardsA)
        if (!valueA[0]) return '出牌不合法'
        const cardsB = Poker.toCards(lastTurnPoker)
        if (cardsB.length === 0) return ''
        const valueB = Rule.cardsValue(cardsB)
        if (valueA[0] !== valueB[0] && valueA[1] < 1000) return '出牌类型跟上家不一致'
        if (valueA[1] > valueB[1]) return ''
        return '出牌需要大于上家'
    }

    playPoker(lastTurnPoker: number[]) {
        this.lastTurnPoker = lastTurnPoker

        const group = this.shotLayer
        const step = this.game.scale.width / 6
        let sx = this.game.scale.width / 2 - 0.5 * step
        const children = group.getChildren()
        if (!this.game.isLastShotPlayer()) {
            sx -= 0.5 * step
            const pass = children[0]
            pass.x = sx
            sx += step
            pass.setVisible(true)
        }
        const hint = children[1]
        hint.x = sx
        hint.setVisible(true)
        const shot = children[2]
        shot.x = sx + step
        shot.setVisible(true)

        this.enableInput()
    }

    sortPoker() {
        this.pokerInHand.sort(Poker.comparePoker)
    }

    dealPoker() {
        this.sortPoker()
        const length = this.pokerInHand.length
        for (let i = 0; i < length; i++) {
            const pid = this.pokerInHand[i]
            const p = new Poker(this.game, pid, pid)
            this.pushAPoker(p)
            this.dealPokerAnim(p, i)
        }
    }

    dealPokerAnim(p: any, i: number) {
        this.game.tweens.add({
            targets: p,
            x: this.game.scale.width / 2 + Poker.PW * 0.44 * (i - 8.5),
            y: this.game.scale.height - Poker.PH / 2,
            duration: 500,
            delay: 50 * i,
            ease: 'Linear'
        })
    }

    arrangePoker() {
        const count = this.pokerInHand.length
        const gap = Math.min(this.game.scale.width / count, Poker.PW * 0.44)
        for (let i = 0; i < count; i++) {
            const p = this.findAPoker(this.pokerInHand[i])
            this.game.children.bringToTop(p)
            this.game.tweens.add({
                targets: p,
                x: this.game.scale.width / 2 + (i - count / 2) * gap,
                duration: 600,
                ease: 'Linear'
            })
        }
    }

    pushAPoker(poker: any) {
        this._pokerPic[poker.id] = poker
        poker.setInteractive()
        poker.on('pointerdown', () => this.onInputDown(poker))
        poker.on('pointerover', () => this.onInputOver(poker))
        poker.input.enabled = false // 轮到自己时才开启
    }

    removeAPoker(pid: number) {
        const length = this.pokerInHand.length
        for (let i = 0; i < length; i++) {
            if (this.pokerInHand[i] === pid) {
                this.pokerInHand.splice(i, 1)
                delete this._pokerPic[pid]
                return
            }
        }
        console.log('Error: REMOVE POKER ', pid)
    }

    findAPoker(pid: number): any {
        const poker = this._pokerPic[pid]
        if (poker === undefined) {
            console.log('Error: FIND POKER ', pid)
        }
        return poker
    }

    enableInput() {
        const length = this.pokerInHand.length
        for (let i = 0; i < length; i++) {
            const p = this.findAPoker(this.pokerInHand[i])
            if (p && p.input) p.input.enabled = true
        }
    }

    pokerSelected(pokers: number[]) {
        for (let i = 0; i < pokers.length; i++) {
            const p = this.findAPoker(pokers[i])
            if (p) p.y = this.game.scale.height - Poker.PH * 0.8
        }
    }

    pokerUnSelected(pokers: number[]) {
        for (let i = 0; i < pokers.length; i++) {
            const p = this.findAPoker(pokers[i])
            if (p) p.y = this.game.scale.height - Poker.PH / 2
        }
    }
}

class NetPlayer extends Player {
    uiLeftPoker: any
    uiName: any

    constructor(seat: number, scene: any) {
        super(seat, scene)
        this._pokerPic = []
    }

    pushAPoker(poker: any) {
        this._pokerPic.push(poker)
        this.updateLeftPoker()
    }

    removeAPoker(pid: number) {
        let i = this.pokerInHand.length - 1
        for (; i >= 0; i--) {
            if (this.pokerInHand[i] === pid) {
                this.pokerInHand.splice(i, 1)
                break
            }
        }
        if (i === -1) this.pokerInHand.pop()
        i = this._pokerPic.length - 1
        for (; i >= 0; i--) {
            if (this._pokerPic[i].id === pid) {
                this._pokerPic.splice(i, 1)
                break
            }
        }
        if (i === -1) this._pokerPic.pop()
        this.updateLeftPoker()
    }

    arrangePoker() {
        if (this.pokerInHand.length > 0 && this.pokerInHand[0] < 54) {
            this.reDealPoker()
        }
    }

    replacePoker(pokers: number[], start: number) {
        if (this.pokerInHand.length !== pokers.length - start) {
            console.log('ERROR ReplacePoker:', this.pokerInHand, pokers)
        }
        if (this._pokerPic.length !== pokers.length - start) {
            console.log('ERROR ReplacePoker:', this._pokerPic, pokers)
        }
        const length = this.pokerInHand.length
        for (let i = 0; i < length; i++) {
            this.pokerInHand[i] = pokers[start + i]
            this._pokerPic[i].id = pokers[start + i]
            this._pokerPic[i].setFrame(pokers[start + i] - 1)
        }
    }

    findAPoker(pid: number): any {
        for (let i = this._pokerPic.length - 1; i >= 0; i--) {
            if (this._pokerPic[i].id === pid) return this._pokerPic[i]
        }
        return this._pokerPic[this._pokerPic.length - 1]
    }

    reDealPoker() {
        this.sortPoker()
        const length = this.pokerInHand.length
        for (let i = 0; i < length; i++) {
            const p = this.findAPoker(this.pokerInHand[i])
            this.game.children.bringToTop(p)
            this.dealPokerAnim(p, this.seat === 1 ? length - 1 - i : i)
        }
    }

    cleanPokers() {
        const length = this.pokerInHand.length
        for (let i = 0; i < length; i++) {
            const p = this.findAPoker(this.pokerInHand[i])
            if (p) p.destroy()
        }
        this.pokerInHand = []
        this._pokerPic = []
        this.updateLeftPoker()
    }

    dealPokerAnim(p: any, i: number) {
        const width = this.game.scale.width
        if (p.id > 53) {
            this.game.tweens.add({
                targets: p,
                x: this.seat === 1 ? width - Poker.PW / 2 : Poker.PW / 2,
                y: this.uiHead.y + Poker.PH / 2 + 10,
                duration: 500,
                delay: 25 + 50 * i,
                ease: 'Linear'
            })
        } else {
            this.game.tweens.add({
                targets: p,
                x: this.seat === 1 ? (width - Poker.PW / 2) - (i * Poker.PW * 0.44) : Poker.PW / 2 + i * Poker.PW * 0.44,
                y: this.seat === 1 ? this.uiHead.y + Poker.PH / 2 + 10 : this.uiHead.y + Poker.PH * 1.5 + 20,
                duration: 500,
                delay: 50 * i,
                ease: 'Linear'
            })
        }
    }

    initUI(sx: number, sy: number) {
        super.initUI(sx, sy)
        this.uiLeftPoker = this.game.add.text(sx, sy + Poker.PH + 10, '17', {
            font: '22px Arial', color: '#ffffff', align: 'center'
        })
        this.uiLeftPoker.setOrigin(0.5, 0)
        this.uiLeftPoker.setVisible(false)

        const style = {font: '20px Arial', color: '#c8c8c8', align: 'center'}
        if (this.seat === 1) {
            this.uiName = this.game.add.text(sx - 40, sy - 80, '等待玩家加入', style)
            this.uiName.setOrigin(1, 0)
        } else {
            this.uiName = this.game.add.text(sx + 40, sy - 80, '等待玩家加入', style)
            this.uiName.setOrigin(0, 0)
        }
    }

    updateInfo(uid: number, name: string) {
        super.updateInfo(uid, name)
        if (uid) {
            this.uiName.setText(name)
        } else {
            this.uiName.setText('等待玩家加入')
        }
    }

    updateLeftPoker() {
        const len = this.pokerInHand.length
        if (len > 0) {
            this.uiLeftPoker.setText('' + this.pokerInHand.length)
            this.uiLeftPoker.setVisible(true)
        } else {
            this.uiLeftPoker.setVisible(false)
        }
    }
}

export {Player, NetPlayer}
export default Player
