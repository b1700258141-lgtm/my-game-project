/**
 * 马的角色模块 - 管理小马的状态和渲染
 */
const Pony = (function() {
    function getGroundY() {
        return Constants.CANVAS_HEIGHT - Constants.PonyConfig.GROUND_OFFSET;
    }

    function calculateShadowParams() {
        const groundY = getGroundY();
        const ponyY = GameState.get('ponyY');
        const maxHeight = groundY - 200;
        const heightRatio = Math.max(0, (groundY - ponyY) / maxHeight);

        return {
            radius: 20 - heightRatio * 15,
            alpha: 0.3 - heightRatio * 0.25
        };
    }

    function init() {
        GameState.setPonyY(getGroundY());
        GameState.init();
        console.log(`[Pony] Initialized at y=${GameState.get('ponyY')}`);
    }

    function jump() {
        if (GameState.get('ponyState') === Constants.PonyState.RUNNING && GameState.isPonyOnGround()) {
            GameState.setPonyState(Constants.PonyState.JUMPING);
            GameState.setVelocityY(Constants.JumpPhysics.JUMP_FORCE);
            GameState.setOnGround(false);
            console.log(`[Pony] State changed: jumping, velocityY=${GameState.get('velocityY')}`);
        }
    }

    function update() {
        const state = GameState.get('ponyState');
        const dt = GameState.get('deltaTime');
        const timeScale = dt * 60;

        if (state === Constants.PonyState.JUMPING) {
            let velocity = GameState.get('velocityY');
            velocity += Constants.JumpPhysics.GRAVITY * timeScale;
            GameState.setVelocityY(velocity);

            let y = GameState.get('ponyY');
            y += velocity * timeScale;
            GameState.setPonyY(y);

            const groundY = getGroundY();
            if (y >= groundY) {
                GameState.setPonyY(groundY);
                GameState.setVelocityY(0);
                GameState.setOnGround(true);
                GameState.setPonyState(Constants.PonyState.RUNNING);
                GameState.spawnDustParticles();
                console.log(`[Pony] State changed: running (landed)`);
            }
        } else if (state === Constants.PonyState.RUNNING) {
            GameState.updateRunFrame();
        }

        GameState.updateDustParticles();

        // 检查光环触发
        const egg = GameState.getActiveEasterEgg();
        if (egg && egg.effect === 'halo' && GameState.get('halos').length === 0) {
            GameState.spawnHalos();
        }
    }

    function getEmoji() {
        const state = GameState.get('ponyState');
        if (state === Constants.PonyState.DEAD) {
            return '💥';
        }
        // 天马行空彩蛋
        if (GameState.get('isUnicorn')) {
            return '🦄';
        }
        if (state === Constants.PonyState.JUMPING) {
            return '🏇';
        }
        return '🐎';
    }

    function renderShadow(ctx, x) {
        const shadow = calculateShadowParams();
        if (shadow.alpha <= 0.05) return;

        const groundY = getGroundY();
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(x, groundY, shadow.radius, shadow.radius * 0.3, 0, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 0, 0, ${shadow.alpha})`;
        ctx.fill();
        ctx.restore();
    }

    function renderDustParticles(ctx) {
        const particles = GameState.getDustParticles();
        particles.forEach(p => {
            ctx.save();
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(196, 168, 130, ${p.alpha})`;
            ctx.fill();
            ctx.restore();
        });
    }

    function renderHalos(ctx) {
        const halos = GameState.getHalos();
        halos.forEach(halo => {
            ctx.save();
            ctx.beginPath();
            ctx.arc(halo.x, halo.y, halo.radius, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(255, 255, 0, ${halo.alpha})`;
            ctx.lineWidth = 3;
            ctx.stroke();
            ctx.restore();
        });
    }

    function render(ctx) {
        const canvas = Renderer.getCanvas();
        const x = Constants.PonyConfig.X;
        let y = GameState.get('ponyY');

        // 计算死亡抖动偏移
        let shakeX = 0, shakeY = 0;
        if (GameState.isDeathShaking()) {
            const offset = GameState.getDeathShakeOffset();
            shakeX = offset.x;
            shakeY = offset.y;
        }

        // 计算动画偏移
        let offsetX = 0, offsetY = 0;
        const state = GameState.get('ponyState');

        if (state === Constants.PonyState.IDLE) {
            offsetY = Math.sin(Date.now() / 300) * 5;
        } else if (state === Constants.PonyState.RUNNING) {
            offsetX = GameState.get('runFrameOffset');
        }

        const drawX = x + shakeX + offsetX;
        const drawY = y + shakeY + offsetY;

        // 渲染阴影
        renderShadow(ctx, drawX);

        // 渲染光环（在一马当先彩蛋时）
        renderHalos(ctx);

        // 渲染尘土粒子（落地尘土）
        renderDustParticles(ctx);

        ctx.save();
        ctx.translate(drawX, drawY);

        // 应用缩放动画
        const scaleMultiplier = Effects.getScaleMultiplier();
        const bigModeScale = GameState.isBigModeActive()
            ? Constants.PowerUpConfig.BIG_MODE.SIZE_MULTIPLIER
            : 1;
        const totalScale = scaleMultiplier * bigModeScale;

        ctx.scale(-totalScale, totalScale);

        // 字号根据变大状态调整
        const fontSize = Constants.PonyConfig.FONT_SIZE;
        ctx.font = `${fontSize}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(getEmoji(), 0, 0);

        ctx.restore();
    }

    function renderDebugInfo(ctx) {
        if (!Constants.Debug.ENABLED) return;

        ctx.save();
        ctx.font = '16px monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillStyle = '#888888';

        const pos = Constants.Debug.POSITION;
        ctx.fillText(`velocityY: ${GameState.get('velocityY').toFixed(2)}`, pos.x, pos.y);
        ctx.fillText(`horse.y: ${GameState.get('ponyY').toFixed(2)}`, pos.x, pos.y + 22);
        ctx.fillText(`isOnGround: ${GameState.isPonyOnGround()}`, pos.x, pos.y + 44);
        ctx.fillText(`highScore: ${GameState.getHighScore()}`, pos.x, pos.y + 66);
        ctx.fillText(`isUnicorn: ${GameState.get('isUnicorn')}`, pos.x, pos.y + 88);

        ctx.restore();
    }

    function reset() {
        GameState.resetPony();
        console.log(`[Pony] Reset to idle state`);
    }

    function die() {
        if (GameState.get('ponyState') !== Constants.PonyState.DEAD) {
            GameState.gameOver();
            console.log(`[Pony] State changed: dead`);
        }
    }

    return {
        init,
        update,
        render,
        renderShadow,
        renderDustParticles,
        renderHalos,
        renderDebugInfo,
        jump,
        reset,
        die,
        getGroundY,
        getEmoji
    };
})();
