import Phaser from 'phaser'

// 资源加载场景, 加载完成后进入游戏场景
class BootScene extends Phaser.Scene {

    constructor() {
        super('BootScene')
    }

    preload() {
        this.load.audio('music_game', 'assets/audio/bg_game.ogg')
        this.load.audio('music_room', 'assets/audio/bg_room.mp3')
        this.load.audio('music_deal', 'assets/audio/deal.mp3')
        this.load.audio('music_win', 'assets/audio/end_win.mp3')
        this.load.audio('music_lose', 'assets/audio/end_lose.mp3')
        this.load.audio('f_score_0', 'assets/audio/f_score_0.mp3')
        this.load.audio('f_score_1', 'assets/audio/f_score_1.mp3')
        this.load.audio('f_score_2', 'assets/audio/f_score_2.mp3')
        this.load.audio('f_score_3', 'assets/audio/f_score_3.mp3')

        this.load.multiatlas('ui', 'assets/ui.json', 'assets')
        this.load.image('bg', 'assets/bg.png')
        this.load.image('ready', 'assets/ready.png')
        this.load.spritesheet('poker', 'assets/poker.png', {
            frameWidth: 90,
            frameHeight: 120
        })
        this.load.json('rule', 'assets/rule.json')
    }

    create() {
        this.scene.start('GameScene')
    }
}

export {BootScene}
export default BootScene
