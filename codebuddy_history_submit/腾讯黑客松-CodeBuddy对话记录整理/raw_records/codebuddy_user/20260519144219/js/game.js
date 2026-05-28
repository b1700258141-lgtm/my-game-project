/**
 * 游戏逻辑模块 - 处理游戏核心逻辑
 */
const GameLogic = (function() {
    function init() {
        Pony.init();
        console.log('Game initialized');
    }

    function update(timestamp) {
        if (!GameState.isPlaying()) {
            GameState.checkSpeedUpTimeout();
            return;
        }

        // 更新帧计数
        GameState.set('frameCount', GameState.get('frameCount') + 1);

        // 基于时间计分
        const dt = GameState.get('deltaTime');
        GameState.addScoreByTime(dt);

        // 更新彩蛋系统
        GameState.updateEasterEgg();

        // 更新马的物理状态
        Pony.update();

        // 更新障碍物
        Obstacle.update(timestamp);

        // 检查金币生成
        Coin.checkSpawn(timestamp);

        // 更新金币
        Coin.update(dt);

        // 更新道具（状态管理）
        GameState.updateActivePowerUps(dt);

        // 检查道具生成
        PowerUp.checkSpawn(timestamp);

        // 更新道具
        PowerUp.update(dt);

        // 检查道具结束并触发特效
        const endedPowerUp = GameState.consumePowerUpEnded();
        if (endedPowerUp) {
            if (endedPowerUp === 'speedBoost') {
                Effects.onSpeedBoostEnded();
            } else if (endedPowerUp === 'bigMode') {
                Effects.onBigModeEnded();
            }
        }

        // 碰撞检测（无敌帧期间跳过）
        if (!GameState.isInvincible() && Collision.checkPonyObstacleCollision()) {
            Pony.die();
            return;
        }

        // 金币碰撞检测
        Coin.checkCollision();

        // 道具碰撞检测
        PowerUp.checkCollision();

        // 更新特效
        Effects.update(dt);
    }

    function startGame() {
        GameState.start();
        console.log(`[Game] State changed: playing`);
    }

    function endGame() {
        Pony.die();
    }

    function restartGame() {
        GameState.reset();
        Pony.reset();
        Obstacle.clearObstacles();
        Coin.clear();
        GameState.start();
        console.log(`[Game] Restarted`);
    }

    return {
        init,
        update,
        startGame,
        endGame,
        restartGame
    };
})();
