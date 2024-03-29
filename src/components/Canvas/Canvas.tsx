import React, {useEffect, useRef, useState} from "react";
import styles from "./Canvas.module.scss";
import {observer} from "mobx-react-lite";
import canvasState from "../../store/canvasState";
import toolState from "../../store/toolState";
import Brush from "../../tools/Brush";
import Rect from "../../tools/Rect"
import {Button, Modal} from "react-bootstrap";
import {useInput} from "../../hooks/useInput";
import {Params, useParams} from "react-router-dom";
import axios from 'axios';

type TFigure = {
    type: 'brush' | 'finish' | 'rect',
    x: number,
    y: number,
    width?: number,
    height?: number,
    color?: string,
}

export type TSessionMessageType = {
    id: string,
    username?: string,
    method: 'draw' | 'connection'
    figure: TFigure
}

const Canvas = observer(() => {
    // Также через ref взаимодействуют с неконтролируемыми компонентами
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isModal, setIsModal] = useState(true);
    const username = useInput('')
    const params: Readonly<Params<string>> = useParams();

    const setCanvasBackground = (canvas: HTMLCanvasElement, color: string) => {
        const context = canvas.getContext('2d');
        context!.fillStyle = color;
        context!.fillRect(0, 0, canvas.width, canvas.height)
    }

    useEffect(() => {
        canvasState.setCanvas(canvasRef.current);
        if (canvasState.canvas) {
            setCanvasBackground(canvasState.canvas, "white")
            const context = canvasRef.current!.getContext('2d');
            axios.get(`http://localhost:5005/image?id=${params.id}`)
                .then((res) => {
                    const img = new Image();
                    img.src = res.data;
                    img.onload = () => {
                        context!.clearRect(0, 0, canvasRef.current!.width, canvasRef.current!.height);
                        context!.drawImage(img, 0, 0, canvasRef.current!.width, canvasRef.current!.height);
                    }
                })
        }

    }, []);

    useEffect(() => {
        if (canvasState.username) {
            const socket = new WebSocket('ws://localhost:5005')
            canvasState.setSocket(socket);
            if (params.id) {
                toolState.setTool(new Brush(canvasRef.current, socket, params.id));
            }

            if (params!.id) {
                canvasState.setSessionId(params.id);
            }
            socket.onopen = () => {
                socket.send(JSON.stringify({
                    id: params.id,
                    username: canvasState.username,
                    method: "connection"
                } as TSessionMessageType))
            }
            socket.onmessage = (e) => {
                const msg: TSessionMessageType = JSON.parse(e.data)
                switch (msg.method) {
                    case "connection": {
                        console.log(`User ${msg.username} was connected successfully`)
                        break
                    }
                    case "draw": {
                        drawHandler(msg)
                        break
                    }
                }
            }
        }
    }, [canvasState.username, params.id])

    const drawHandler = (msg: TSessionMessageType) => {
        const {figure} = msg;
        const context = canvasRef!.current!.getContext('2d');
        switch (figure.type) {
            case "brush": {
                Brush.draw(context as CanvasRenderingContext2D, figure.x, figure.y)
                break
            }
            case "rect": {
                Rect.staticDraw(context as CanvasRenderingContext2D, figure.x, figure.y, figure.width as number, figure.height as number, figure.color as string)
                break
            }
            case "finish": {
                context!.beginPath()
                break
            }
        }

    }

    const onMouseDownHandler = () => {
        // Do screenshot canvas and send it to store
        const screenshot = canvasRef!.current!.toDataURL();
        canvasState.pushToUndo(screenshot);
        axios.post(`http://localhost:5005/image?id=${params.id}`, {img: screenshot})
            .then((res) => console.log(res.data))
    }

    const connectionHandler = () => {
        canvasState.setUserName(username.value)
        if (username.value.length) {
            setIsModal(false);
        }
    }

    return (
        <>
            <Modal show={isModal} onHide={() => {
                setIsModal(false)
            }}>
                <Modal.Header closeButton>
                    <Modal.Title>Modal heading</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <input {...username}></input>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="primary" onClick={connectionHandler}>
                        log in
                    </Button>
                </Modal.Footer>
            </Modal>
            <div className={styles.canvas}>
                <canvas onMouseDown={onMouseDownHandler} ref={canvasRef} width={600} height={400}/>
            </div>
        </>
    );
});

export default Canvas;
