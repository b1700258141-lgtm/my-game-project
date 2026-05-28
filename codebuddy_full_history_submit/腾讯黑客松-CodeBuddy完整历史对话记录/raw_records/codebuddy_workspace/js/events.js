/**
 * 事件监听模块 - 处理用户输入
 */
const EventHandler = (function() {
    function init() {
        // 键盘事件
        document.addEventListener('keydown', handleKeyDown);
        document.addEventListener('keyup', handleKeyUp);

        // 鼠标点击事件
        const canvas = Renderer.getCanvas();
        if (canvas) {
            canvas.addEventListener('mousedown', handleMouseDown);
            canvas.addEventListener('mouseup', handleMouseUp);
            canvas.addEventListener('click', handleClick);
        }
    }

    function handleKeyDown(e) {
        if (e.code === 'Space' && !e.repeat) {
            e.preventDefault();
            GameState.setJumpKeyDownTime(performance.now());
            handleAction();
        }
    }

    function handleKeyUp(e) {
        if (e.code === 'Space') {
            e.preventDefault();
            GameState.applyLongJumpBonus();
            GameState.clearJumpKeyState();
        }
    }

    function handleMouseDown(e) {
        GameState.setJumpKeyDownTime(performance.now());
    }

    function handleMouseUp(e) {
        GameState.applyLongJumpBonus();
        GameState.clearJumpKeyState();
    }

    function handleClick(e) {
        e.preventDefault();
        handleAction();
    }

    function handleAction() {
        const gameStatus = GameState.get('status');
        const ponyState = GameState.get('ponyState');

        console.log('[Event] handleAction called, status:', gameStatus);

        if (gameStatus === Constants.GameStatus.IDLE) {
            // idle 状态：开始游戏
            console.log('[Event] Starting game...');
            GameLogic.startGame();
        } else if (gameStatus === Constants.GameStatus.PLAYING) {
            // playing 状态：如果是奔跑中，则跳跃
            if (ponyState === Constants.PonyState.RUNNING) {
                Pony.jump();
            }
        } else if (gameStatus === Constants.GameStatus.GAME_OVER) {
            // gameOver 状态：重新开始
            GameLogic.restartGame();
        }
    }

    function destroy() {
        document.removeEventListener('keydown', handleKeyDown);
        document.removeEventListener('keyup', handleKeyUp);
        const canvas = Renderer.getCanvas();
        if (canvas) {
            canvas.removeEventListener('mousedown', handleMouseDown);
            canvas.removeEventListener('mouseup', handleMouseUp);
            canvas.removeEventListener('click', handleClick);
        }
    }

    return {
        init,
        destroy
    };
})();
