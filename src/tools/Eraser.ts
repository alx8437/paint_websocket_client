import Brush from "./Brush";

export default class Eraser extends Brush {
    mouseDown: boolean | null = null;

    constructor(canvas: HTMLCanvasElement | null, socket: WebSocket, sessionId: string) {
        // Функция super будет вызывать конструктор родительского класса, в нее передаем canvas
        super(canvas, socket, sessionId);
    }
    // После создания объекта, canvas будет слушать все эти функции - запускаем в конструкторе

    mouseMoveHandler(event: any) {
        if (this.mouseDown) {
            this.draw(
                event.pageX - event.target.offsetLeft,
                event.pageY - event.target.offsetTop
            );
        }
    }

    draw(x: number, y: number) {
        this.context!.lineTo(x, y);
        this.context!.strokeStyle = 'white'
        this.context!.stroke();
    }
}
