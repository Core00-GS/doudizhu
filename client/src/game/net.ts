// 与服务端约定的协议, 消息格式: [code, {json}]
export const Protocol = {
    ERROR: 0,

    REQ_ROOM_LIST: 1001,
    RSP_ROOM_LIST: 1002,

    REQ_NEW_ROOM: 1003,
    RSP_NEW_ROOM: 1004,

    REQ_JOIN_ROOM: 1005,
    RSP_JOIN_ROOM: 1006,

    REQ_LEAVE_ROOM: 1007,
    RSP_LEAVE_ROOM: 1008,

    REQ_READY: 2001,
    RSP_READY: 2002,

    RSP_DEAL_POKER: 2004,

    REQ_CALL_SCORE: 2005,
    RSP_CALL_SCORE: 2006,

    REQ_SHOT_POKER: 3001,
    RSP_SHOT_POKER: 3002,

    RSP_GAME_OVER: 4002,
}

function prettyLog(tag, packet) {
    if (!Array.isArray(packet)) {
        console.log(`${tag}: ${JSON.stringify(packet)}`)
        return
    }
    for (const key in Protocol) {
        if (packet[0] === Protocol[key]) {
            console.log(`${tag}: ${key} ${JSON.stringify(packet.slice(1))}`)
            return
        }
    }
    console.log(`${tag}: ${packet[0]} ${JSON.stringify(packet.slice(1))}`)
}

export class Socket {
    websocket: WebSocket

    constructor(url: string) {
        this.websocket = new WebSocket(url)
        this.websocket.binaryType = 'arraybuffer'
    }

    connect(onopen: () => void, onmessage: (packet: any) => void, onerror: () => void) {
        this.websocket.onopen = () => {
            console.log('CONNECTED')
            onopen()
        }
        this.websocket.onerror = (evt) => {
            console.log('CONNECT ERROR: ' + evt)
            this.websocket = null
            onerror()
        }
        this.websocket.onclose = () => {
            console.log('DISCONNECTED')
            this.websocket = null
            onerror()
        }
        this.websocket.onmessage = (evt) => {
            const packet = JSON.parse(evt.data)
            prettyLog('RSP', packet)
            onmessage(packet)
        }
    }

    send(packet: any) {
        prettyLog('REQ', packet)
        this.websocket.send(JSON.stringify(packet))
    }
}

export default Socket
