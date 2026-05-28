/**
 * 特效模块 - 管理所有视觉特效和动画反馈
 * 不修改游戏逻辑，仅增强表现层
 */
const Effects = (function() {
    const Config = EffectsConfig;

    // ========== 特效状态 ==========
    let coinParticles = [];           // 金币粒子
    let speedTrails = [];             // 加速闪电残影
    let bigGlow = { active: false, scale: 1, phase: 'none' };  // 变大光晕
    let scaleAnim = { active: false, type: null, startTime: 0, progress: 0 };  // 缩放动画
    let notifications = [];           // 通知队列
    let endEffects = [];             // 结束特效

    // ========== 初始化 ==========
    function init() {
        coinParticles = [];
        speedTrails = [];
        bigGlow = { active: false, scale: 1, phase: 'none' };
        scaleAnim = { active: false, type: null, startTime: 0, progress: 0 };
        notifications = [];
        endEffects = [];
    }

    // ========== 更新 ==========
    function update(dt) {
        if (!Config.ENABLED) return;

        updateCoinParticles(dt);
        updateSpeedTrails(dt);
        updateScaleAnim(dt);
        updateNotifications(dt);
        updateEndEffects(dt);
    }

    // ========== 金币粒子特效 ==========
    function spawnCoinParticles(x, y) {
        const cfg = Config.COIN_PARTICLES;
        for (let i = 0; i < cfg.COUNT; i++) {
            const angle = (Math.PI * 2 / cfg.COUNT) * i + Math.random() * 0.5;
            coinParticles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * cfg.SPEED,
                vy: Math.sin(angle) * cfg.SPEED - 50,
                radius: cfg.SIZE * (0.5 + Math.random() * 0.5),
                alpha: 1,
                startTime: performance.now()
            });
        }
    }

    function updateCoinParticles(dt) {
        const now = performance.now();
        const cfg = Config.COIN_PARTICLES;

        for (let i = coinParticles.length - 1; i >= 0; i--) {
            const p = coinParticles[i];
            const elapsed = now - p.startTime;
            const progress = elapsed / cfg.DURATION;

            if (progress >= 1) {
                coinParticles.splice(i, 1);
                continue;
            }

            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vy += 300 * dt;  // 重力
            p.alpha = 1 - progress;
        }
    }

    // ========== 加速闪电残影特效 ==========
    function activateSpeedTrail() {
        const ponyX = Constants.PonyConfig.X;
        const ponyY = GameState.get('ponyY');
        const cfg = Config.SPEED_TRAIL;

        speedTrails = [];
        for (let i = 0; i < cfg.COUNT; i++) {
            speedTrails.push({
                x: ponyX,
                y: ponyY,
                alpha: 1 - (i / cfg.COUNT) * 0.7,
                offsetX: i * 15,
                scale: 1 - (i / cfg.COUNT) * 0.3
            });
        }
    }

    function updateSpeedTrails(dt) {
        for (let i = speedTrails.length - 1; i >= 0; i--) {
            const trail = speedTrails[i];
            trail.offsetX -= 200 * dt;
            trail.alpha -= 0.03;

            if (trail.alpha <= 0) {
                speedTrails.splice(i, 1);
            }
        }
    }

    // ========== 变大缩放动画 ==========
    function activateBigScaleAnim() {
        scaleAnim = {
            active: true,
            type: 'big',
            startTime: performance.now(),
            progress: 0
        };
    }

    function activateSmallScaleAnim() {
        scaleAnim = {
            active: true,
            type: 'small',
            startTime: performance.now(),
            progress: 0
        };
    }

    function updateScaleAnim(dt) {
        if (!scaleAnim.active) return;

        const now = performance.now();
        const elapsed = now - scaleAnim.startTime;
        const cfg = Config.SCALE_ANIM;
        scaleAnim.progress = Math.min(elapsed / cfg.DURATION, 1);

        // 弹簧缓动
        if (scaleAnim.progress >= 1) {
            scaleAnim.active = false;
            scaleAnim.progress = 0;
        }
    }

    function getScaleMultiplier() {
        if (!scaleAnim.active) return 1;

        const cfg = Config.SCALE_ANIM;
        const t = scaleAnim.progress;

        if (scaleAnim.type === 'big') {
            // 先放大到1.3，再回到1.0
            if (t < 0.5) {
                return 1 + (cfg.OVERSHOOT - 1) * (t * 2);
            } else {
                return cfg.OVERSHOOT - (cfg.OVERSHOOT - 1) * ((t - 0.5) * 2);
            }
        } else {
            // 反向缩放：从大变小到正常
            const overshoot = cfg.OVERSHOOT;
            if (t < 0.5) {
                return overshoot - (overshoot - 1) * (t * 2);
            } else {
                return 1 + (1 - t) * 2 * 0.3;
            }
        }
    }

    // ========== 通知系统 ==========
    function pushNotification(text, color, bgColor) {
        if (!Config.ENABLED) return;

        const now = performance.now();
        const cfg = Config.NOTIFICATION;

        // 移除超出数量的通知
        while (notifications.length >= cfg.MAX_VISIBLE) {
            notifications.shift();
        }

        // 添加新通知
        notifications.push({
            text: text,
            color: color,
            bgColor: bgColor,
            startTime: now,
            slideProgress: 0  // 0: 滑入中, 1: 显示中, >1: 滑出中
        });
    }

    function updateNotifications(dt) {
        const now = performance.now();
        const cfg = Config.NOTIFICATION;

        for (let i = notifications.length - 1; i >= 0; i--) {
            const notif = notifications[i];
            const elapsed = now - notif.startTime;
            const slideSpeed = cfg.SLIDE_SPEED / 1000;
            const showDuration = (cfg.DURATION - cfg.SLIDE_SPEED * 2) / 1000;

            if (elapsed < slideSpeed) {
                // 滑入中
                notif.slideProgress = elapsed / cfg.SLIDE_SPEED;
            } else if (elapsed < slideSpeed + showDuration) {
                // 显示中
                notif.slideProgress = 1;
            } else if (elapsed < cfg.DURATION / 1000) {
                // 滑出中
                notif.slideProgress = 1 - (elapsed - slideSpeed - showDuration) / slideSpeed;
            } else {
                // 移除
                notifications.splice(i, 1);
            }
        }
    }

    // ========== 结束特效 ==========
    function spawnEndEffect(type) {
        const ponyX = Constants.PonyConfig.X;
        const ponyY = GameState.get('ponyY');

        endEffects.push({
            type: type,
            x: ponyX,
            y: ponyY,
            startTime: performance.now(),
            progress: 0
        });

        // 添加结束通知
        const text = type === 'speedBoost' ? '加速结束' : '变大结束';
        const color = type === 'speedBoost' ? '#1E90FF' : '#DC143C';
        pushNotification(text, color, 'rgba(128, 128, 128, 0.9)');
    }

    function updateEndEffects(dt) {
        const now = performance.now();

        for (let i = endEffects.length - 1; i >= 0; i--) {
            const effect = endEffects[i];
            const elapsed = now - effect.startTime;

            if (effect.type === 'speedBoost') {
                effect.progress = Math.min(elapsed / 400, 1);
                if (effect.progress >= 1) {
                    endEffects.splice(i, 1);
                }
            } else {
                // bigMode 结束特效与缩放动画合并
                if (elapsed > 300) {
                    endEffects.splice(i, 1);
                }
            }
        }
    }

    // ========== 渲染 ==========
    function render(ctx) {
        if (!Config.ENABLED) return;

        renderCoinParticles(ctx);
        renderSpeedTrails(ctx);
        renderEndEffects(ctx);
        renderNotifications(ctx);
        renderPowerUpBar(ctx);
    }

    // 渲染金币粒子
    function renderCoinParticles(ctx) {
        coinParticles.forEach(p => {
            ctx.save();
            ctx.globalAlpha = p.alpha;
            ctx.fillStyle = Config.COIN_PARTICLES.COLOR;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        });
    }

    // 渲染闪电残影
    function renderSpeedTrails(ctx) {
        speedTrails.forEach(trail => {
            ctx.save();
            ctx.globalAlpha = trail.alpha;
            ctx.font = `${Constants.PonyConfig.FONT_SIZE}px serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            // 绘制闪电符号
            ctx.fillStyle = Config.SPEED_TRAIL.COLOR;
            const emoji = '⚡';
            ctx.translate(trail.x + trail.offsetX, trail.y);
            ctx.scale(-trail.scale, trail.scale);
            ctx.fillText(emoji, 0, 0);

            ctx.restore();
        });
    }

    // 渲染结束特效
    function renderEndEffects(ctx) {
        endEffects.forEach(effect => {
            if (effect.type === 'speedBoost') {
                // 减速波纹
                const radius = 30 + effect.progress * 100;
                const alpha = 1 - effect.progress;

                ctx.save();
                ctx.globalAlpha = alpha * 0.5;
                ctx.strokeStyle = '#1E90FF';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(effect.x, effect.y, radius, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
            }
        });
    }

    // 渲染通知
    function renderNotifications(ctx) {
        const cfg = Config.NOTIFICATION;
        const canvas = Renderer.getCanvas();

        notifications.forEach((notif, index) => {
            ctx.save();

            // 计算位置（顶部居中，依次下移）
            const totalWidth = cfg.WIDTH + cfg.MARGIN;
            const x = (canvas.width - totalWidth * notifications.length) / 2 + index * totalWidth;
            const y = -cfg.HEIGHT;

            // 滑入滑出动画
            let displayY;
            if (notif.slideProgress <= 0) {
                displayY = y;
            } else if (notif.slideProgress >= 1) {
                displayY = 10;
            } else {
                displayY = y + (10 - y) * easeOutCubic(notif.slideProgress);
            }

            // 绘制通知
            ctx.fillStyle = notif.bgColor;
            ctx.beginPath();
            ctx.roundRect(x, displayY, cfg.WIDTH, cfg.HEIGHT, 8);
            ctx.fill();

            ctx.fillStyle = notif.color;
            ctx.font = 'bold 16px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(notif.text, x + cfg.WIDTH / 2, displayY + cfg.HEIGHT / 2);

            ctx.restore();
        });
    }

    // 渲染道具栏
    function renderPowerUpBar(ctx) {
        if (!GameState.isPlaying()) return;

        const cfg = Config.POWERUP_BAR;
        const activePowerUps = GameState.getActivePowerUps();

        let iconIndex = 0;

        // 加速道具
        if (activePowerUps.speedBoost.active) {
            renderPowerUpIndicator(ctx, 'speedBoost', iconIndex);
            iconIndex++;
        }

        // 变大道具
        if (activePowerUps.bigMode.active) {
            renderPowerUpIndicator(ctx, 'bigMode', iconIndex);
        }
    }

    function renderPowerUpIndicator(ctx, type, index) {
        const cfg = Config.POWERUP_BAR;
        const activePowerUps = GameState.getActivePowerUps();
        const powerUp = activePowerUps[type];
        const config = type === 'speedBoost'
            ? Constants.PowerUpConfig.SPEED_BOOST
            : Constants.PowerUpConfig.BIG_MODE;

        const y = cfg.Y - index * (cfg.HEIGHT + 10);
        const x = cfg.X;

        // 背景
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.beginPath();
        ctx.roundRect(x, y, cfg.WIDTH, cfg.HEIGHT, 8);
        ctx.fill();

        // 图标
        ctx.fillStyle = config.COLOR;
        ctx.font = `${cfg.ICON_SIZE}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(config.SYMBOL, x + cfg.ICON_SIZE / 2 + 10, y + cfg.HEIGHT / 2);

        // 名称
        ctx.fillStyle = 'white';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(type === 'speedBoost' ? '加速' : '变大', x + cfg.ICON_SIZE + 20, y + cfg.HEIGHT / 2 - 6);

        // 进度条
        const progress = powerUp.timeLeft / config.DURATION;
        const barX = x + cfg.ICON_SIZE + 20;
        const barY = y + cfg.HEIGHT / 2 + 4;
        const remainingTime = powerUp.timeLeft / 1000;

        // 进度条背景
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.fillRect(barX, barY, cfg.BAR_WIDTH, cfg.BAR_HEIGHT);

        // 进度条
        let barColor = config.COLOR;
        if (remainingTime < 1) {
            // 低于1秒闪烁
            barColor = Math.sin(performance.now() / 100) > 0 ? '#FF0000' : config.COLOR;
        }
        ctx.fillStyle = barColor;
        ctx.fillRect(barX, barY, cfg.BAR_WIDTH * progress, cfg.BAR_HEIGHT);

        // 时间文字
        ctx.fillStyle = 'white';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(remainingTime.toFixed(1) + 's', x + cfg.WIDTH - 5, y + cfg.HEIGHT / 2 - 6);
    }

    // ========== 变大光晕 ==========
    function activateBigGlow() {
        bigGlow.active = true;
        bigGlow.phase = 'active';
    }

    function deactivateBigGlow() {
        bigGlow.active = false;
    }

    function renderBigGlow(ctx, x, y, scale) {
        if (!Config.ENABLED) return;

        const cfg = Config.BIG_GLOW;
        const now = performance.now();

        // 呼吸效果
        const breathPhase = Math.sin(now * cfg.BREATH_SPEED) * 0.5 + 0.5;
        const radius = cfg.MIN_RADIUS + (cfg.MAX_RADIUS - cfg.MIN_RADIUS) * breathPhase;

        // 检查是否在变大状态
        if (!GameState.isBigModeActive() && !bigGlow.active) return;

        ctx.save();
        ctx.strokeStyle = cfg.COLOR;
        ctx.lineWidth = 3;
        ctx.globalAlpha = 0.6 + breathPhase * 0.4;

        // 绘制光晕
        ctx.beginPath();
        ctx.arc(x, y, radius * scale, 0, Math.PI * 2);
        ctx.stroke();

        // 内圈
        ctx.globalAlpha = 0.3 + breathPhase * 0.3;
        ctx.beginPath();
        ctx.arc(x, y, radius * scale * 0.7, 0, Math.PI * 2);
        ctx.stroke();

        ctx.restore();
    }

    // ========== 背景拉伸效果 ==========
    let backgroundStretch = { active: false, frames: 0 };

    function activateBackgroundStretch() {
        backgroundStretch.active = true;
        backgroundStretch.frames = 2;
    }

    function getBackgroundStretch() {
        if (!Config.ENABLED || !backgroundStretch.active) return 1;
        return 1.2;  // 拉伸比例
    }

    function updateBackgroundStretch() {
        if (backgroundStretch.active && backgroundStretch.frames > 0) {
            backgroundStretch.frames--;
            if (backgroundStretch.frames <= 0) {
                backgroundStretch.active = false;
            }
        }
    }

    // ========== 工具函数 ==========
    function easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
    }

    // ========== 外部触发接口 ==========
    function onCoinCollected(x, y) {
        if (!Config.ENABLED) return;
        spawnCoinParticles(x, y);
        pushNotification('金币 +10', '#333333', 'rgba(255, 215, 0, 0.9)');
    }

    function onSpeedBoostCollected(duration) {
        if (!Config.ENABLED) return;
        activateSpeedTrail();
        activateBackgroundStretch();
        pushNotification(`⚡ 加速模式！${duration / 1000}秒`, 'white', 'rgba(30, 144, 255, 0.9)');
    }

    function onBigModeCollected(duration) {
        if (!Config.ENABLED) return;
        activateBigScaleAnim();
        activateBigGlow();
        pushNotification(`变大啦！${duration / 1000}秒`, 'white', 'rgba(220, 20, 60, 0.9)');
    }

    function onSpeedBoostEnded() {
        if (!Config.ENABLED) return;
        spawnEndEffect('speedBoost');
    }

    function onBigModeEnded() {
        if (!Config.ENABLED) return;
        activateSmallScaleAnim();
        deactivateBigGlow();
        spawnEndEffect('bigMode');
    }

    // ========== 导出接口 ==========
    return {
        init,
        update,
        render,
        getScaleMultiplier,
        renderBigGlow,
        getBackgroundStretch,
        updateBackgroundStretch,
        onCoinCollected,
        onSpeedBoostCollected,
        onBigModeCollected,
        onSpeedBoostEnded,
        onBigModeEnded
    };
})();
