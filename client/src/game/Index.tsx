import React from 'react'
import Phaser from 'phaser'
import {BootScene} from './boot'
import GameScene from './game'

interface GameProps {
    onLogout?: () => void
}

// Phaser 容器组件
// - 横屏 960x540 (匹配 player.js / game.js 中所有坐标计算)
// - 在 componentDidMount 中创建 Phaser.Game (避免每次 render 都新建)
// - 在 componentWillUnmount 中销毁
class Game extends React.Component<GameProps> {

    private containerRef: React.RefObject<HTMLDivElement>
    private game: Phaser.Game | null

    constructor(props: GameProps) {
        super(props)
        this.containerRef = React.createRef()
        this.game = null
    }

    componentDidMount() {
        if (this.game) return
        const config = {
            type: Phaser.AUTO,
            parent: this.containerRef.current,
            backgroundColor: '#182d3b',
            scale: {
                parent: this.containerRef.current,
                mode: Phaser.Scale.FIT,
                width: 960,
                height: 540,
            },
            scene: [BootScene, GameScene],
        }
        this.game = new Phaser.Game(config)
    }

    componentWillUnmount() {
        if (this.game) {
            this.game.destroy(true)
            this.game = null
        }
    }

    render() {
        return (
            <div
                ref={this.containerRef}
                style={{margin: 'auto', width: '100%', height: '100%'}}
            />
        )
    }

}

export default Game
