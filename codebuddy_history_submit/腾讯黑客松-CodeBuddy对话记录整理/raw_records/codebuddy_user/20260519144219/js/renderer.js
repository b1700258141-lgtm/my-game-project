/**
 * 渲染模块 - 处理 Canvas 绘制
 */
const Renderer = (function() {
    let canvas = null;
    let ctx = null;

    function init(canvasId) {
        canvas = document.getElementById(canvasId);
        if (!canvas) {
            console.error('Canvas element not found');
            return false;
        }
        ctx = canvas.getContext('2d');
        canvas.width = Constants.CANVAS_WIDTH;
        canvas.height = Constants.CANVAS_HEIGHT;
        return true;
    }

    function clear() {
        if (!ctx) return;
        ctx.fillStyle = GameState.getBackgroundColor();
        ctx.fillRect(0, 0, Constants.CANVAS_WIDTH, Constants.CANVAS_HEIGHT);
    }

    function drawText(text, x, y, options = {}) {
        if (!ctx) return;
        ctx.save();
        ctx.fillStyle = options.color || Constants.Colors.text;
        ctx.font = options.font || '24px sans-serif';
        ctx.textAlign = options.align || 'center';
        ctx.textBaseline = options.baseline || 'middle';
        ctx.fillText(text, x, y);
        ctx.restore();
    }

    function getContext() {
        return ctx;
    }

    function getCanvas() {
        return canvas;
    }

    return {
        init,
        clear,
        drawText,
        getContext,
        getCanvas
    };
})();
