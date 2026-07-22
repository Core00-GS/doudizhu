import React from 'react'
import Login from './components/Login'
import Game from './game/Index'


// 顶层路由:
// - 有 token -> 游戏
// - 无 token -> 登录
// 登录成功后 Login.js 会写入 localStorage 并调用 onLogin -> setState 切到游戏
interface AppState {
    page: 'login' | 'game'
}

class App extends React.Component<{}, AppState> {

    constructor(props: {}) {
        super(props)
        const token = localStorage.getItem('token')
        const playerInfo = this.loadPlayerInfo()
        // 把 playerInfo 暴露到 window, GameScene.create 会读取
        if (playerInfo) {
            window.playerInfo = playerInfo
        }
        this.state = {
            page: token ? 'game' : 'login',
        }
    }

    loadPlayerInfo() {
        try {
            const raw = localStorage.getItem('playerInfo')
            return raw ? JSON.parse(raw) : null
        } catch (e) {
            return null
        }
    }

    onLogin(playerInfo) {
        window.playerInfo = playerInfo
        this.setState({page: 'game'})
    }

    onLogout() {
        localStorage.removeItem('token')
        localStorage.removeItem('playerInfo')
        delete window.playerInfo
        this.setState({page: 'login'})
    }

    render() {
        switch (this.state.page) {
            case 'game':
                return <Game onLogout={() => this.onLogout()}/>
            case 'login':
            default:
                return <Login onLogin={playerInfo => this.onLogin(playerInfo)}/>
        }
    }
}

export default App
