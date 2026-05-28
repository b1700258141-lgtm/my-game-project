/**
 * 主入口模块 - 游戏初始化和主循环
 */
const Game = (function() {
    let animationId = null;
    let lastTime = 0;

    function init() {
        console.log('[Game] Initializing...');

        const success = Renderer.init('gameCanvas');
        if (!success) {
            console.error('Failed to initialize renderer');
            return;
        }

        console.log('[Game] Renderer initialized');
        EventHandler.init();
        console.log('[Game] EventHandler initialized');
        GameLogic.init();
        console.log('[Game] GameLogic initialized');
        Visual.init();
        console.log('[Game] Visual initialized');
        Effects.init();
        console.log('[Game] Effects initialized');

        gameLoop();

        console.log('[Game] Game loop started');
        console.log('[Game] Initial status:', GameState.get('status'));
    }

    function gameLoop(timestamp = 0) {
        GameState.updateDeltaTime(timestamp, lastTime);
        lastTime = timestamp;

        // 更新视觉模块
        Visual.update(GameState.get('deltaTime'));

        Renderer.clear();

        GameLogic.update(timestamp);

        // 渲染视觉背景层次
        Visual.renderBackground(Renderer.getContext());
        Visual.renderClouds(Renderer.getContext());
        Visual.renderHills(Renderer.getContext());
        Visual.renderGroundFill(Renderer.getContext());

        // 渲染地面线和小草
        renderGroundDecorations();

        // 渲染障碍物
        Obstacle.render(Renderer.getContext());

        // 渲染金币
        Coin.render(Renderer.getContext());

        // 渲染道具
        PowerUp.render(Renderer.getContext());

        // 渲染马的视觉效果（残影在最底层）
        Visual.renderAfterimages(Renderer.getContext());

        // 渲染变大光晕（在马下面）
        if (GameState.isBigModeActive() || Effects.getScaleMultiplier() > 1) {
            const ponyX = Constants.PonyConfig.X;
            const ponyY = GameState.get('ponyY');
            Effects.renderBigGlow(Renderer.getContext(), ponyX, ponyY, Effects.getScaleMultiplier());
        }

        Pony.render(Renderer.getContext());

        // 马蹄尘点（在马之后渲染）
        Visual.renderHoofDusts(Renderer.getContext());
        Visual.renderSpeechBubble(Renderer.getContext());

        // 渲染特效（粒子、闪电残影等）
        Effects.render(Renderer.getContext());

        // 调试碰撞箱
        Collision.renderDebugBoxes(Renderer.getContext());

        renderUI();
        renderEasterEgg();
        renderGameOverScreen();

        animationId = requestAnimationFrame(gameLoop);
    }

    function renderGroundDecorations() {
        const ctx = Renderer.getContext();
        const canvas = Renderer.getCanvas();

        const groundY = Pony.getGroundY();

        // 棕色实线地面
        ctx.strokeStyle = Constants.Colors.ground;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, groundY);
        ctx.lineTo(canvas.width, groundY);
        ctx.stroke();

        // 虚线装饰
        ctx.strokeStyle = 'rgba(196, 168, 130, 0.3)';
        ctx.lineWidth = 1;
        ctx.setLineDash([10, 10]);
        ctx.beginPath();
        ctx.moveTo(0, groundY + 10);
        ctx.lineTo(canvas.width, groundY + 10);
        ctx.stroke();
        ctx.setLineDash([]);

        // 小草（视觉模式开启时）
        Visual.renderGrass(ctx);
    }

    function renderGround() {
        const ctx = Renderer.getContext();
        const canvas = Renderer.getCanvas();
        if (!ctx || !canvas) return;

        const groundY = Pony.getGroundY();

        ctx.strokeStyle = Constants.Colors.ground;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, groundY);
        ctx.lineTo(canvas.width, groundY);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(196, 168, 130, 0.3)';
        ctx.lineWidth = 1;
        ctx.setLineDash([10, 10]);
        ctx.beginPath();
        ctx.moveTo(0, groundY + 10);
        ctx.lineTo(canvas.width, groundY + 10);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    function renderUI() {
        const ctx = Renderer.getContext();
        const canvas = Renderer.getCanvas();
        if (!ctx || !canvas) return;

        if (GameState.isIdle()) {
            Renderer.drawText('🐎 拍我开始！', canvas.width / 2, canvas.height / 2, {
                font: '64px serif',
                color: Constants.Colors.accent
            });
        }

        if (!GameState.isIdle() && !GameState.isDead()) {
            Renderer.drawText('按空格键跳跃', canvas.width / 2, canvas.height - 30, {
                font: '18px sans-serif',
                color: '#888888'
            });
        }

        // 分数显示（右上角）
        if (!GameState.isIdle() && !GameState.isDead()) {
            Renderer.drawText(`${GameState.getDisplayScore()} 米`, canvas.width - 40, 30, {
                font: 'bold 28px sans-serif',
                color: Constants.Colors.text,
                align: 'right'
            });
        }

        // 金币计数显示
        if (!GameState.isIdle() && !GameState.isDead()) {
            const coinCount = GameState.getCoinCount();
            Renderer.drawText(`🪙 x ${coinCount}`, canvas.width - 40, 65, {
                font: '22px sans-serif',
                color: Constants.Colors.gold,
                align: 'right'
            });
        }

        // 速度显示
        if (!GameState.isIdle() && !GameState.isDead()) {
            Renderer.drawText(`速度: ${GameState.getSpeed().toFixed(1)}`, canvas.width - 20, 60, {
                font: '20px sans-serif',
                color: '#666666',
                align: 'right'
            });
        }

        // 提速提示
        if (GameState.shouldShowSpeedUp()) {
            const elapsed = performance.now() - GameState.get('speedUpStartTime') || 0;
            const alpha = 1 - elapsed / 1000;
            if (alpha > 0) {
                Renderer.drawText('提速！', canvas.width / 2, canvas.height / 2 - 100, {
                    font: '36px sans-serif',
                    color: `rgba(230, 126, 34, ${alpha})`
                });
            }
        }

        // 最高分显示
        if (!GameState.isIdle() && !GameState.isDead()) {
            Renderer.drawText(`最高: ${GameState.getHighScore()}`, 20, 30, {
                font: '18px sans-serif',
                color: '#999999',
                align: 'left'
            });
        }
    }

    function renderEasterEgg() {
        const ctx = Renderer.getContext();
        const canvas = Renderer.getCanvas();
        if (!ctx || !canvas) return;

        const eggInfo = GameState.getEasterEggProgress();
        if (!eggInfo || eggInfo.phase === 'end') return;

        const egg = GameState.getActiveEasterEgg();
        if (!egg) return;

        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;

        // 半透明黑色遮罩
        const overlayAlpha = eggInfo.phase === 'fadeOut' ? 0.4 * eggInfo.progress : 0.4;
        ctx.fillStyle = `rgba(0, 0, 0, ${overlayAlpha})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 文字缩放动画
        let scale = 1;
        if (eggInfo.phase === 'scaleIn') {
            // 0.3 -> 1.0 缓动
            scale = 0.3 + 0.7 * easeOutBack(eggInfo.progress);
        } else if (eggInfo.phase === 'fadeOut') {
            scale = eggInfo.progress;
        }

        // 绘制彩蛋文字
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.scale(scale, scale);
        ctx.font = 'bold 80px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // 文字阴影
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillText(`${egg.emoji} ${egg.text}`, 3, 3);

        // 主文字
        ctx.fillStyle = '#ffffff';
        ctx.fillText(`${egg.emoji} ${egg.text}`, 0, 0);

        ctx.restore();
    }

    // 缓动函数
    function easeOutBack(t) {
        const c1 = 1.70158;
        const c3 = c1 + 1;
        return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    }

    function renderGameOverScreen() {
        const ctx = Renderer.getContext();
        const canvas = Renderer.getCanvas();
        if (!ctx || !canvas) return;

        if (!GameState.shouldShowGameOverScreen()) return;

        ctx.fillStyle = Constants.Colors.overlay;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;

        // 标题
        Renderer.drawText('💀 马失前蹄！', centerX, centerY - 140, {
            font: 'bold 72px sans-serif',
            color: Constants.Colors.skull
        });

        // 本次得分
        Renderer.drawText(`本次得分：${GameState.getDisplayScore()} 米`, centerX, centerY - 30, {
            font: '36px sans-serif',
            color: '#ffffff'
        });

        // 历史最高
        Renderer.drawText(`历史最高：${GameState.getHighScore()} 米`, centerX, centerY + 30, {
            font: '36px sans-serif',
            color: '#ffd700'
        });

        // 已解锁成语
        const triggered = GameState.getTriggeredEasterEggs();
        if (triggered.length > 0) {
            const eggNames = triggered.map(score => {
                const egg = Constants.EasterEggConfig.find(e => e.score === score);
                return egg ? egg.text.replace(/[🎊⚡🧭🌊✨]/g, '').trim() : '';
            }).join(' / ');

            Renderer.drawText(`本局解锁成语：${eggNames}`, centerX, centerY + 90, {
                font: '24px sans-serif',
                color: '#aaaaaa'
            });
        }

        // 重新开始提示
        Renderer.drawText('按空格重新出发', centerX, centerY + 150, {
            font: '28px sans-serif',
            color: '#aaaaaa'
        });
    }

    function stop() {
        if (animationId) {
            cancelAnimationFrame(animationId);
            animationId = null;
        }
        EventHandler.destroy();
    }

    return {
        init,
        stop,
        gameLoop
    };
})();
