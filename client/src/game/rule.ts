// 斗地主牌型规则, RuleList 由 GameScene 从 rule.json 载入后赋值
export class Rule {
    static RuleList: any = []

    static cardsAbove(handCards: string[], turnCards: string[]): string {
        const turnValue = this.cardsValue(turnCards)
        if (turnValue[0] === '') return ''
        handCards.sort(this.sorter)
        let oneRule = Rule.RuleList[turnValue[0]]
        for (let i = (turnValue[1] as number) + 1; i < oneRule.length; i++) {
            if (this.containsAll(handCards, oneRule[i])) return oneRule[i]
        }

        if ((turnValue[1] as number) < 10000) {
            oneRule = Rule.RuleList['bomb']
            for (let i = 0; i < oneRule.length; i++) {
                if (this.containsAll(handCards, oneRule[i])) return oneRule[i]
            }
            if (this.containsAll(handCards, 'wW')) return 'wW'
        }
        return ''
    }

    static bestShot(handCards: string[]): string {
        handCards.sort(this.sorter)
        let shot = ''
        for (let i = 2; i < this._CardsType.length; i++) {
            const oneRule = Rule.RuleList[this._CardsType[i]]
            for (let j = 0; j < oneRule.length; j++) {
                if (oneRule[j].length > shot.length && this.containsAll(handCards, oneRule[j])) {
                    shot = oneRule[j]
                }
            }
        }

        if (shot === '') {
            const oneRule = Rule.RuleList['bomb']
            for (let i = 0; i < oneRule.length; i++) {
                if (this.containsAll(handCards, oneRule[i])) return oneRule[i]
            }
            if (this.containsAll(handCards, 'wW')) return 'wW'
        }
        return shot
    }

    static _CardsType = [
        'rocket', 'bomb',
        'single', 'pair', 'trio', 'trio_pair', 'trio_single',
        'seq_single5', 'seq_single6', 'seq_single7', 'seq_single8', 'seq_single9', 'seq_single10', 'seq_single11', 'seq_single12',
        'seq_pair3', 'seq_pair4', 'seq_pair5', 'seq_pair6', 'seq_pair7', 'seq_pair8', 'seq_pair9', 'seq_pair10',
        'seq_trio2', 'seq_trio3', 'seq_trio4', 'seq_trio5', 'seq_trio6',
        'seq_trio_pair2', 'seq_trio_pair3', 'seq_trio_pair4',
        'seq_trio_single2', 'seq_trio_single3', 'seq_trio_single4', 'seq_trio_single5',
        'bomb_pair', 'bomb_single']

    static sorter(a: string, b: string): number {
        const card_str = '34567890JQKA2wW'
        return card_str.indexOf(a) - card_str.indexOf(b)
    }

    static index_of(array: string[], ele: string): number {
        if (array[0].length !== ele.length) return -1
        for (let i = 0, l = array.length; i < l; i++) {
            if (array[i] === ele) return i
        }
        return -1
    }

    static containsAll(parent: string | string[], child: string): boolean {
        let index = 0
        for (let i = 0; i < child.length; i++) {
            index = (parent as any).indexOf(child[i], index)
            if (index === -1) return false
            index += 1
        }
        return true
    }

    static cardsValue(cards: string[] | string): [string, number] {
        if (typeof (cards) !== 'string') {
            cards.sort(this.sorter)
            cards = cards.join('')
        }

        if (cards === 'wW') return ['rocket', 20000]

        const bombIndex = this.index_of(Rule.RuleList['bomb'], cards)
        if (bombIndex >= 0) return ['bomb', 10000 + bombIndex]

        const length = this._CardsType.length
        for (let i = 2; i < length; i++) {
            const typeName = this._CardsType[i]
            const idx = this.index_of(Rule.RuleList[typeName], cards)
            if (idx >= 0) return [typeName, idx]
        }
        console.log('Error: UNKNOWN TYPE ', cards)
        return ['', 0]
    }

    static compare(cardsA: string[], cardsB: string[]): number {
        if (cardsA.length === 0 && cardsB.length === 0) return 0
        if (cardsA.length === 0) return -1
        if (cardsB.length === 0) return 1

        const valueA = this.cardsValue(cardsA)
        const valueB = this.cardsValue(cardsB)

        if ((valueA[1] < 10000 && valueB[1] < 10000) && (valueA[0] !== valueB[0])) {
            console.log('Error: Compare ', cardsA, cardsB)
        }
        return valueA[1] - valueB[1]
    }

    static shufflePoker(): number[] {
        const pokers: number[] = []
        for (let i = 0; i < 54; i++) pokers.push(i)

        let currentIndex = pokers.length, temporaryValue: number, randomIndex: number
        while (0 !== currentIndex) {
            randomIndex = Math.floor(Math.random() * currentIndex)
            currentIndex -= 1
            temporaryValue = pokers[currentIndex]
            pokers[currentIndex] = pokers[randomIndex]
            pokers[randomIndex] = temporaryValue
        }
        return pokers
    }
}

export default Rule
