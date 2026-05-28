/**
 * 金币模块 - 管理金币的生成、更新、渲染和碰撞
 */
const Coin = (function() {
    // ========== 配置 ==========
    const Config = Constants.CoinConfig;

    // ========== 收集动画 ==========
    let collectAnimations = [];

    /**
     * 生成金币
     */
    function spawnCoin() {
        const coins = GameState.getCoins();

        // 检查同屏金币数量
        if (coins.length >= Config.MAX_COINS) return;

        const groundY = Pony.getGroundY();
        const yOffset = Config.MIN_Y_OFFSET + Math.random() * (Config.MAX_Y_OFFSET - Config.MIN_Y_OFFSET);
        const y = groundY - yOffset;

        // 生成x坐标（从右侧开始，留出一定间距）
        const x = Constants.CANVAS_WIDTH + Config.RADIUS;

        // 检查与障碍物的间距
        const obstacles = GameState.getObstacles();
        let tooClose = false;
        for (const obs of obstacles) {
            if (Math.abs(obs.x - x) < Config.MIN_DISTANCE) {
                tooClose = true;
                break;
            }
        }

        if (tooClose) return;

        const coin = {
            x: x,
            y: y,
            radius: Config.RADIUS,
            rotation: 0,              // 旋转角度（用于视觉动画）
            frame: 0                  // 当前帧（用于消失动画）
        };

        GameState.addCoin(coin);
    }

    /**
     * 检查是否应该生成金币
     */
    function checkSpawn(timestamp) {
        if (!GameState.isPlaying()) return;

        const coins = GameState.getCoins();
        if (coins.length >= Config.MAX_COINS) return;

        const lastSpawnTime = GameState.getLastCoinSpawnTime();
        const nextInterval = GameState.getNextCoinInterval();

        if (timestamp - lastSpawnTime >= nextInterval) {
            spawnCoin();
            GameState.setLastCoinSpawnTime(timestamp);
            // 设置下一次生成的随机间隔
            GameState.setNextCoinInterval(
                Config.SPAWN_MIN_INTERVAL + Math.random() * (Config.SPAWN_MAX_INTERVAL - Config.SPAWN_MIN_INTERVAL)
            );
        }
    }

    /**
     * 更新金币
     */
    function update(dt) {
        const coins = GameState.getCoins();
        const speed = GameState.getSpeed();
        const deltaX = speed * dt * 60;

        // 更新位置
        for (let i = coins.length - 1; i >= 0; i--) {
            const coin = coins[i];
            coin.x -= deltaX;
            coin.rotation += 0.15;  // 旋转动画

            // 移除超出左边的金币
            if (coin.x + coin.radius < 0) {
                GameState.removeCoin(i);
            }
        }

        // 更新收集动画
        updateCollectAnimations();

        // 更新消失动画
        for (let i = coins.length - 1; i >= 0; i--) {
            const coin = coins[i];
            if (coin.collecting) {
                coin.frame++;
                if (coin.frame >= Config.DISAPPEAR_ANIM_FRAMES) {
                    GameState.removeCoin(i);
                }
            }
        }
    }

    /**
     * 检测与马的碰撞
     */
    function checkCollision() {
        if (!GameState.isPlaying()) return;

        const coins = GameState.getCoins();
        const ponyX = Constants.PonyConfig.X;
        const ponyY = GameState.get('ponyY');
        const ponyRadius = Constants.PonyConfig.COLLISION_SIZE / 2;

        for (let i = coins.length - 1; i >= 0; i--) {
            const coin = coins[i];
            if (coin.collecting) continue;

            // 圆形碰撞检测（圆心距 < 半径之和）
            const dx = ponyX - coin.x;
            const dy = ponyY - coin.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < ponyRadius + coin.radius) {
                // 收集金币
                collectCoin(coin, i);
            }
        }
    }

    /**
     * 收集金币
     */
    function collectCoin(coin, index) {
        // 添加收集动画
        collectAnimations.push({
            x: coin.x,
            y: coin.y,
            startTime: performance.now(),
            alpha: 1,
            offsetY: 0
        });

        // 触发特效
        Effects.onCoinCollected(coin.x, coin.y);

        // 标记为正在消失
        coin.collecting = true;
        coin.frame = 0;

        // 增加分数
        GameState.addScoreByTime(0);  // 先确保分数是数字
        const currentScore = GameState.getScore();
        GameState.set('score', currentScore + Config.SCORE_VALUE);
        GameState.incrementCoinCount();

        console.log(`[Coin] Collected! Total: ${GameState.getCoinCount()}`);
    }

    /**
     * 更新收集动画
     */
    function updateCollectAnimations() {
        const now = performance.now();

        for (let i = collectAnimations.length - 1; i >= 0; i--) {
            const anim = collectAnimations[i];
            const elapsed = now - anim.startTime;
            const progress = elapsed / Config.COLLECT_ANIM_DURATION;

            if (progress >= 1) {
                collectAnimations.splice(i, 1);
            } else {
                anim.alpha = 1 - progress;
                anim.offsetY = -50 * progress;  // 向上飘动
            }
        }
    }

    /**
     * 渲染金币
     */
    function render(ctx) {
        const coins = GameState.getCoins();

        coins.forEach(coin => {
            if (coin.collecting) {
                // 消失动画：旋转缩小
                renderDisappearAnimation(ctx, coin);
            } else {
                // 正常渲染
                renderCoin(ctx, coin);
            }
        });

        // 渲染收集动画（+10 文字）
        renderCollectAnimations(ctx);
    }

    /**
     * 渲染单个金币
     */
    function renderCoin(ctx, coin) {
        ctx.save();
        ctx.translate(coin.x, coin.y);

        // 旋转动画（模拟3D翻转）
        const scaleX = Math.cos(coin.rotation);
        ctx.scale(Math.abs(scaleX) * 0.5 + 0.5, 1);

        // 金币外圈发光
        ctx.beginPath();
        ctx.arc(0, 0, coin.radius + 3, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 215, 0, 0.3)';
        ctx.fill();

        // 金币主体
        ctx.beginPath();
        ctx.arc(0, 0, coin.radius, 0, Math.PI * 2);
        ctx.fillStyle = Config.COLOR;
        ctx.fill();

        // 金币边框
        ctx.strokeStyle = '#DAA520';
        ctx.lineWidth = 2;
        ctx.stroke();

        // 内部高光
        ctx.beginPath();
        ctx.arc(-3, -3, coin.radius * 0.3, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.fill();

        // 符号
        ctx.fillStyle = Config.SYMBOL_COLOR;
        ctx.font = `bold ${Config.SYMBOL_SIZE}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(Config.SYMBOL, 0, 1);

        ctx.restore();
    }

    /**
     * 渲染消失动画
     */
    function renderDisappearAnimation(ctx, coin) {
        const progress = coin.frame / Config.DISAPPEAR_ANIM_FRAMES;
        const scale = 1 - progress * 0.5;
        const alpha = 1 - progress;
        const rotation = progress * Math.PI * 2;

        ctx.save();
        ctx.translate(coin.x, coin.y);
        ctx.rotate(rotation);
        ctx.scale(scale, scale);
        ctx.globalAlpha = alpha;

        // 金币主体
        ctx.beginPath();
        ctx.arc(0, 0, coin.radius, 0, Math.PI * 2);
        ctx.fillStyle = Config.COLOR;
        ctx.fill();

        ctx.strokeStyle = '#DAA520';
        ctx.lineWidth = 2;
        ctx.stroke();

        // 符号
        ctx.fillStyle = Config.SYMBOL_COLOR;
        ctx.font = `bold ${Config.SYMBOL_SIZE}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(Config.SYMBOL, 0, 1);

        ctx.restore();
    }

    /**
     * 渲染收集动画（+10 文字）
     */
    function renderCollectAnimations(ctx) {
        collectAnimations.forEach(anim => {
            ctx.save();
            ctx.globalAlpha = anim.alpha;
            ctx.fillStyle = Config.COLOR;
            ctx.font = 'bold 24px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('+10', anim.x, anim.y + anim.offsetY);
            ctx.restore();
        });
    }

    /**
     * 清除所有金币
     */
    function clear() {
        GameState.getCoins().length = 0;
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
