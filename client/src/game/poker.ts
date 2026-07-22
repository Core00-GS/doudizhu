import Phaser from 'phaser'
import {Rule} from './rule'

// 扑克 ID 约定: 1-52 普通牌, 53 小王(w), 54 大王(W), 55 背面占位
// spritesheet 帧 = ID - 1 (帧 54 为背面)
export class Poker extends Phaser.GameObjects.Sprite {

    static PW = 90
    static PH = 120
    id: number

    constructor(scene: Phaser.Scene, id: number, frame: number) {
        super(scene, scene.scale.width / 2, scene.scale.height * 0.4, 'poker', frame - 1)
        this.id = id
        this.setOrigin(0.5)
        scene.add.existing(this)
    }

    static comparePoker(a, b) {
        if (a instanceof Array) {
            a = a[0]
            b = b[0]
        }
        if (a > 52 || b > 52) {
            return -(a - b)
        }
        a = a % 13
        b = b % 13
        if (a <= 2) a += 13
        if (b <= 2) b += 13
        return -(a - b)
    }

    static toCards(pokers) {
        const cards = []
        for (let i = 0; i < pokers.length; i++) {
            let pid = pokers[i]
            if (pid instanceof Array) {
                pid = pid[0]
            }
            if (pid === 53) {
                cards.push('w')
            } else if (pid === 54) {
                cards.push('W')
            } else {
                cards.push('KA234567890JQ'[pid % 13])
            }
        }
        return cards
    }

    static canCompare(pokersA, pokersB) {
        const cardsA = this.toCards(pokersA)
        const cardsB = this.toCards(pokersB)
        return Rule.cardsValue(cardsA)[0] === Rule.cardsValue(cardsB)[0]
    }

    static toPokers(pokerInHands, cards) {
        const pokers = []
        for (let i = 0; i < cards.length; i++) {
            const candidates = this.toPoker(cards[i])
            for (let j = 0; j < candidates.length; j++) {
                if (pokerInHands.indexOf(candidates[j]) !== -1 && pokers.indexOf(candidates[j]) === -1) {
                    pokers.push(candidates[j])
                    break
                }
            }
        }
        return pokers
    }

    static toPoker(card) {
        const cards = '?A234567890JQK'
        for (let i = 1; i < cards.length; i++) {
            if (card === cards[i]) {
                return [i, i + 13, i + 26, i + 39]
            }
        }
        if (card === 'w') return [53]
        if (card === 'W') return [54]
        return [55]
    }
}

export default Poker
