/**
 * 道具模块 - 管理加速蹄铁和变大道具的生成、更新、渲染和碰撞
 */
const PowerUp = (function() {
    // 收集动画
    let collectAnimations = [];

    /**
     * 生成道具
     */
    function spawnPowerUp() {
        const powerUps = GameState.getPowerUps();

        // 检查是否在冷却中
        if (GameState.isSpeedBoostOnCooldown() && GameState.isBigModeOnCooldown()) {
            return;
        }

        const groundY = Pony.getGroundY();
        const yOffset = Constants.PowerUpConfig.MIN_Y_OFFSET +
            Math.random() * (Constants.PowerUpConfig.MAX_Y_OFFSET - Constants.PowerUpConfig.MIN_Y_OFFSET);
        const y = groundY - yOffset;

        // 生成x坐标（从右侧开始）
        const x = Constants.CANVAS_WIDTH + Constants.PowerUpConfig.SIZE;

        // 确定道具类型（50% / 50%）
        const isSpeedBoost = Math.random() < 0.5;
        let type, config;

        // 如果某种类型在冷却中，强制选择另一种
        if (GameState.isSpeedBoostOnCooldown() && !GameState.isBigModeOnCooldown()) {
            type = 'bigMode';
            config = Constants.PowerUpConfig.BIG_MODE;
        } else if (GameState.isBigModeOnCooldown() && !GameState.isSpeedBoostOnCooldown()) {
            type = 'speedBoost';
            config = Constants.PowerUpConfig.SPEED_BOOST;
        } else {
            type = isSpeedBoost ? 'speedBoost' : 'bigMode';
            config = isSpeedBoost ? Constants.PowerUpConfig.SPEED_BOOST : Constants.PowerUpConfig.BIG_MODE;
        }

        const powerUp = {
            x: x,
            y: y,
            type: type,
            config: config,
            size: Constants.PowerUpConfig.SIZE,
            rotation: 0,
            frame: 0,
            collecting: false
        };

        GameState.addPowerUp(powerUp);
        console.log(`[PowerUp] Spawned: ${type}`);
    }

    /**
     * 检查是否应该生成道具
     */
    function checkSpawn(timestamp) {
        if (!GameState.isPlaying()) return;

        const lastSpawnTime = GameState.getLastPowerUpSpawnTime();
        const nextInterval = GameState.getNextPowerUpInterval();

        if (timestamp - lastSpawnTime >= nextInterval) {
            spawnPowerUp();
            GameState.setLastPowerUpSpawnTime(timestamp);
            // 设置下一次生成的随机间隔
            GameState.setNextPowerUpInterval(
                Constants.PowerUpConfig.SPAWN_MIN_INTERVAL +
                Math.random() * (Constants.PowerUpConfig.SPAWN_MAX_INTERVAL - Constants.PowerUpConfig.SPAWN_MIN_INTERVAL)
            );
        }
    }

    /**
     * 更新道具
     */
    function update(dt) {
        const powerUps = GameState.getPowerUps();
        const speed = GameState.getSpeed();
        const deltaX = speed * dt * 60;

        // 更新位置
        for (let i = powerUps.length - 1; i >= 0; i--) {
            const powerUp = powerUps[i];
            powerUp.x -= deltaX;
            powerUp.rotation += 0.05;

            // 移除超出左边的道具
            if (powerUp.x + powerUp.size < 0) {
                GameState.removePowerUp(i);
            }
        }

        // 更新收集动画
        updateCollectAnimations();

        // 更新消失动画
        for (let i = powerUps.length - 1; i >= 0; i--) {
            const powerUp = powerUps[i];
            if (powerUp.collecting) {
                powerUp.frame++;
                if (powerUp.frame >= 3) {
                    GameState.removePowerUp(i);
                }
            }
        }
    }

    /**
     * 检测与马的碰撞
     */
    function checkCollision() {
        if (!GameState.isPlaying()) return;

        const powerUps = GameState.getPowerUps();
        const ponyX = Constants.PonyConfig.X;
        const ponyY = GameState.get('ponyY');
        const ponyRadius = Constants.PonyConfig.COLLISION_SIZE / 2;

        for (let i = powerUps.length - 1; i >= 0; i--) {
            const powerUp = powerUps[i];
            if (powerUp.collecting) continue;

            // 圆形碰撞检测
            const dx = ponyX - powerUp.x;
            const dy = ponyY - powerUp.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < ponyRadius + powerUp.size / 2) {
                collectPowerUp(powerUp, i);
            }
        }
    }

    /**
     * 收集道具
     */
    function collectPowerUp(powerUp, index) {
        const type = powerUp.type;
        const config = powerUp.config;

        // 添加收集动画
        collectAnimations.push({
            x: powerUp.x,
            y: powerUp.y,
            type: type,
            startTime: performance.now(),
            alpha: 1,
            offsetY: 0
        });

        // 标记为正在消失
        powerUp.collecting = true;
        powerUp.frame = 0;

        // 激活道具效果
        if (type === 'speedBoost') {
            // 加速效果：增加速度
            const currentSpeed = GameState.getSpeed();
            GameState.set('speed', currentSpeed + config.SPEED_INCREMENT);
            GameState.activatePowerUp(type);
            // 触发特效
            Effects.onSpeedBoostCollected(config.DURATION);
        } else if (type === 'bigMode') {
            // 变大效果
            GameState.activatePowerUp(type);
            // 触发特效
            Effects.onBigModeCollected(config.DURATION);
        }

        console.log(`[PowerUp] Collected: ${type}`);
    }

    /**
     * 更新收集动画
     */
    function updateCollectAnimations() {
        const now = performance.now();

        for (let i = collectAnimations.length - 1; i >= 0; i--) {
            const anim = collectAnimations[i];
            const elapsed = now - anim.startTime;
            const duration = 600;
            const progress = elapsed / duration;

            if (progress >= 1) {
                collectAnimations.splice(i, 1);
            } else {
                anim.alpha = 1 - progress;
                anim.offsetY = -50 * progress;
            }
        }
    }

    /**
     * 渲染道具
     */
    function render(ctx) {
        const powerUps = GameState.getPowerUps();

        powerUps.forEach(powerUp => {
            if (powerUp.collecting) {
                renderDisappearAnimation(ctx, powerUp);
            } else {
                renderPowerUp(ctx, powerUp);
            }
        });

        // 渲染收集动画（+10文字等）- 保留用于道具特有的收集反馈
        renderCollectAnimations(ctx);
    }

    /**
     * 渲染单个道具
     */
    function renderPowerUp(ctx, powerUp) {
        ctx.save();
        ctx.translate(powerUp.x, powerUp.y);

        // 悬浮动画
        const floatOffset = Math.sin(performance.now() / 200) * 3;
        ctx.translate(0, floatOffset);

        if (powerUp.type === 'speedBoost') {
            // 加速蹄铁：深蓝色圆角矩形 + ⚡
            const size = powerUp.size;
            const radius = 4;

            // 发光效果
            ctx.shadowColor = powerUp.config.COLOR;
            ctx.shadowBlur = 10;

            // 圆角矩形
            ctx.fillStyle = powerUp.config.COLOR;
            ctx.beginPath();
            ctx.roundRect(-size / 2, -size / 2, size, size, radius);
            ctx.fill();

            // 边框
            ctx.strokeStyle = '#104E8B';
            ctx.lineWidth = 2;
            ctx.stroke();

            // 符号
            ctx.shadowBlur = 0;
            ctx.fillStyle = 'white';
            ctx.font = '16px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(powerUp.config.SYMBOL, 0, 1);

        } else if (powerUp.type === 'bigMode') {
            // 变大道具：红色圆形 + 大
            const size = powerUp.size;

            // 发光效果
            ctx.shadowColor = powerUp.config.COLOR;
            ctx.shadowBlur = 10;

            // 圆形
            ctx.beginPath();
            ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
            ctx.fillStyle = powerUp.config.COLOR;
            ctx.fill();

            // 边框
            ctx.strokeStyle = '#8B0000';
            ctx.lineWidth = 2;
            ctx.stroke();

            // 内部高光
            ctx.beginPath();
            ctx.arc(-3, -3, size * 0.15, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.fill();

            // 文字
            ctx.shadowBlur = 0;
            ctx.fillStyle = 'white';
            ctx.font = 'bold 14px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(powerUp.config.SYMBOL, 0, 1);
        }

        ctx.restore();
    }

    /**
     * 渲染消失动画
     */
    function renderDisappearAnimation(ctx, powerUp) {
        const progress = powerUp.frame / 3;
        const scale = 1 + progress * 0.5;
        const alpha = 1 - progress;
        const rotation = progress * Math.PI;

        ctx.save();
        ctx.translate(powerUp.x, powerUp.y);
        ctx.rotate(rotation);
        ctx.scale(scale, scale);
        ctx.globalAlpha = alpha;

        if (powerUp.type === 'speedBoost') {
            ctx.fillStyle = powerUp.config.COLOR;
            ctx.beginPath();
            ctx.roundRect(-powerUp.size / 2, -powerUp.size / 2, powerUp.size, powerUp.size, 4);
            ctx.fill();
        } else {
            ctx.beginPath();
            ctx.arc(0, 0, powerUp.size / 2, 0, Math.PI * 2);
            ctx.fillStyle = powerUp.config.COLOR;
            ctx.fill();
        }

        ctx.restore();
    }

    /**
     * 渲染收集动画
     */
    function renderCollectAnimations(ctx) {
        collectAnimations.forEach(anim => {
            ctx.save();
            ctx.globalAlpha = anim.alpha;

            const text = anim.type === 'speedBoost' ? '⚡加速!' : '💪变大!';
            const color = anim.type === 'speedBoost' ? '#1E90FF' : '#DC143C';

            ctx.fillStyle = color;
            ctx.font = 'bold 20px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(text, anim.x, anim.y + anim.offsetY);

            ctx.restore();
        });
    }

    /**
     * 渲染生效中的道具指示器
     */
    function renderActiveIndicators(ctx) {
        if (!GameState.isPlaying()) return;

        const canvas = Renderer.getCanvas();
        const startX = 20;
        const startY = 80;
        const barWidth = 60;
        const barHeight = 8;
        const spacing = 70;

        // 加速指示器
        if (GameState.isSpeedBoostActive()) {
            const progress = GameState.getBigModeProgress(); // 这里复用 bigMode 的 progress 方法名，实际上是通用的

            ctx.save();
            ctx.fillStyle = '#1E90FF';
            ctx.font = '14px sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText('⚡速度', startX, startY);

            // 进度条背景
            ctx.fillStyle = 'rgba(30, 144, 255, 0.3)';
            ctx.fillRect(startX, startY + 5, barWidth, barHeight);

            // 进度条
            const speedProgress = GameState.getActivePowerUps().speedBoost.timeLeft / Constants.PowerUpConfig.SPEED_BOOST.DURATION;
            ctx.fillStyle = '#1E90FF';
            ctx.fillRect(startX, startY + 5, barWidth * speedProgress, barHeight);

            ctx.restore();
        }

        // 变大指示器
        if (GameState.isBigModeActive()) {
            ctx.save();
            ctx.fillStyle = '#DC143C';
            ctx.font = '14px sans-serif';
            ctx.textAlign = 'left';

            const bigY = GameState.isSpeedBoostActive() ? startY + spacing : startY;
            ctx.fillText('变大', startX, bigY);

            // 进度条背景
            ctx.fillStyle = 'rgba(220, 20, 60, 0.3)';
            ctx.fillRect(startX, bigY + 5, barWidth, barHeight);

            // 进度条
            const bigProgress = GameState.getBigModeProgress();
            ctx.fillStyle = '#DC143C';
            ctx.fillRect(startX, bigY + 5, barWidth * bigProgress, barHeight);

            ctx.restore();
        }
    }

    /**
     * 清除所有道具
     */
    function clear() {
        GameState.getPowerUps().length = 0;
        collectAnimations = [];
    }

    // ========== 导出接口 ==========
    return {
        checkSpawn,
        update,
        checkCollision,
        render,
        clear
    };
})();
