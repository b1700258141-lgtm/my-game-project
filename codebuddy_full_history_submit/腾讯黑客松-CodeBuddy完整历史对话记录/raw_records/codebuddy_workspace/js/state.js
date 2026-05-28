/**
 * 状态管理模块 - 管理游戏全局状态
 */
const GameState = (function() {
    let state = {
        status: Constants.GameStatus.IDLE,
        score: 0,
        highScore: 0,
        speed: 5,
        baseSpeed: Constants.ObstacleConfig.INITIAL_SPEED,
        frameCount: 0,
        deltaTime: 0,
        // 马的状态
        ponyState: Constants.PonyState.IDLE,
        ponyY: 0,
        velocityY: 0,
        isOnGround: true,
        isShaking: false,
        shakeStartTime: 0,
        shakeFrame: 0,
        runFrameOffset: 0,
        isUnicorn: false,
        // 长按跳跃
        jumpKeyDownTime: 0,
        longJumpApplied: false,
        isJumpingKeyHeld: false,
        // 尘土粒子
        dustParticles: [],
        // 马蹄尘点（视觉）
        hoofDusts: [],
        // 障碍物
        obstacles: [],
        lastObstacleTime: 0,
        nextObstacleInterval: 1500,
        // 提速提示
        showSpeedUp: false,
        speedUpStartTime: 0,
        // 结算界面
        showGameOverScreen: false,
        gameOverStartTime: 0,
        // 死亡抖动
        deathShakeActive: false,
        deathShakeStartTime: 0,
        // 彩蛋系统
        activeEasterEgg: null,
        easterEggStartTime: 0,
        triggeredEasterEggs: [],
        isInvincible: false,
        invincibleStartTime: 0,
        // 光环效果
        halos: [],
        // 背景覆盖
        bgOverride: null,
        bgOverrideStartTime: 0,
        // 金币相关
        coins: [],
        coinCount: 0,                // 收集的金币总数
        lastCoinSpawnTime: 0,
        nextCoinInterval: 0,
        // 道具相关
        powerUps: [],                // 屏幕上的道具
        activePowerUps: {            // 生效中的道具
            speedBoost: { active: false, timeLeft: 0, startTime: 0 },
            bigMode: { active: false, timeLeft: 0, startTime: 0 }
        },
        lastPowerUpSpawnTime: 0,
        nextPowerUpInterval: 0,
        speedBoostCooldown: 0,       // 加速道具冷却
        bigModeCooldown: 0,          // 变大道具冷却
        powerUpEnded: null           // 道具结束通知
    };

    const GROUND_Y = Constants.CANVAS_HEIGHT - Constants.PonyConfig.GROUND_OFFSET;
    const PONY_FOOT_Y = GROUND_Y + Constants.PonyConfig.VISUAL_HEIGHT / 2;

    function loadHighScore() {
        const saved = localStorage.getItem('ponyRunHighScore');
        state.highScore = saved ? parseInt(saved, 10) : 0;
    }

    function saveHighScore() {
        localStorage.setItem('ponyRunHighScore', state.highScore.toString());
    }

    return {
        get(key) {
            return state[key];
        },

        set(key, value) {
            state[key] = value;
        },

        updateDeltaTime(timestamp, lastTime) {
            state.deltaTime = (timestamp - lastTime) / 1000;
        },

        reset() {
            state.score = 0;
            state.speed = Constants.ObstacleConfig.INITIAL_SPEED;
            state.baseSpeed = Constants.ObstacleConfig.INITIAL_SPEED;
            state.frameCount = 0;
            state.status = Constants.GameStatus.IDLE;
            state.showGameOverScreen = false;
            state.deathShakeActive = false;
            state.isUnicorn = false;
            state.triggeredEasterEggs = [];
            state.activeEasterEgg = null;
            state.isInvincible = false;
            state.halos = [];
            state.bgOverride = null;
            state.coins = [];
            state.coinCount = 0;
            state.powerUps = [];
            state.activePowerUps.speedBoost = { active: false, timeLeft: 0, startTime: 0 };
            state.activePowerUps.bigMode = { active: false, timeLeft: 0, startTime: 0 };
            state.speedBoostCooldown = 0;
            state.bigModeCooldown = 0;
        },

        resetPony() {
            state.ponyState = Constants.PonyState.IDLE;
            state.ponyY = GROUND_Y;
            state.velocityY = 0;
            state.isOnGround = true;
            state.isShaking = false;
            state.shakeStartTime = 0;
            state.shakeFrame = 0;
            state.runFrameOffset = 0;
            state.jumpKeyDownTime = 0;
            state.longJumpApplied = false;
            state.isJumpingKeyHeld = false;
            state.dustParticles = [];
            state.hoofDusts = [];
        },

        resetObstacles() {
            state.obstacles = [];
            state.lastObstacleTime = 0;
            state.nextObstacleInterval = Constants.ObstacleConfig.MIN_INTERVAL +
                Math.random() * (Constants.ObstacleConfig.MAX_INTERVAL - Constants.ObstacleConfig.MIN_INTERVAL);
            state.showSpeedUp = false;
        },

        start() {
            state.status = Constants.GameStatus.PLAYING;
            this.resetPony();
            this.resetObstacles();
            this.resetCoins();
            this.resetPowerUps();
            state.ponyState = Constants.PonyState.RUNNING;
            state.score = 0;
            state.speed = Constants.ObstacleConfig.INITIAL_SPEED;
            state.baseSpeed = Constants.ObstacleConfig.INITIAL_SPEED;
            state.showGameOverScreen = false;
            state.deathShakeActive = false;
            state.isUnicorn = false;
            state.triggeredEasterEggs = [];
            state.activeEasterEgg = null;
            state.isInvincible = false;
            state.halos = [];
            state.bgOverride = null;
        },

        pause() {
            state.status = Constants.GameStatus.PAUSED;
        },

        resume() {
            state.status = Constants.GameStatus.PLAYING;
        },

        gameOver() {
            state.status = Constants.GameStatus.GAME_OVER;
            state.ponyState = Constants.PonyState.DEAD;

            if (state.score > state.highScore) {
                state.highScore = state.score;
                saveHighScore();
            }

            state.deathShakeActive = true;
            state.deathShakeStartTime = performance.now();
            state.gameOverStartTime = performance.now();
            state.showGameOverScreen = false;
            state.activeEasterEgg = null;
        },

        isIdle() {
            return state.status === Constants.GameStatus.IDLE;
        },

        isPlaying() {
            return state.status === Constants.GameStatus.PLAYING;
        },

        isDead() {
            return state.status === Constants.GameStatus.GAME_OVER;
        },

        isPonyOnGround() {
            return state.isOnGround;
        },

        setPonyY(y) {
            state.ponyY = y;
        },

        setVelocityY(v) {
            state.velocityY = v;
        },

        setPonyState(ponyState) {
            state.ponyState = ponyState;
        },

        setOnGround(isOnGround) {
            state.isOnGround = isOnGround;
        },

        getGroundY() {
            return GROUND_Y;
        },

        getPonyFootY() {
            return PONY_FOOT_Y;
        },

        updateRunFrame() {
            if (state.frameCount % Constants.PonyConfig.RUN_FRAME_INTERVAL === 0) {
                state.runFrameOffset = state.runFrameOffset === 0 ? 10 : 0;
            }
        },

        isDeathShaking() {
            if (!state.deathShakeActive) return false;
            const elapsed = performance.now() - state.deathShakeStartTime;
            return elapsed < Constants.DeathShake.DURATION;
        },

        getDeathShakeOffset() {
            if (!this.isDeathShaking()) return { x: 0, y: 0 };
            const elapsed = performance.now() - state.deathShakeStartTime;
            const progress = elapsed / Constants.DeathShake.DURATION;
            const frame = Math.floor(progress * Constants.DeathShake.FRAME_COUNT);
            const offset = Math.sin(frame * Math.PI) * Constants.DeathShake.AMPLITUDE;
            return { x: frame % 2 === 0 ? offset : -offset, y: 0 };
        },

        shouldShowGameOverScreen() {
            if (state.showGameOverScreen) return true;
            if (!state.deathShakeActive) return false;
            const elapsed = performance.now() - state.gameOverStartTime;
            if (elapsed >= Constants.GameOverScreen.SHOW_DELAY) {
                state.showGameOverScreen = true;
                return true;
            }
            return false;
        },

        getScore() {
            return Math.floor(state.score);
        },

        getDisplayScore() {
            return Math.floor(state.score);
        },

        getHighScore() {
            return state.highScore;
        },

        // 计分（基于时间）
        addScoreByTime(dt) {
            state.score += Constants.ScoreConfig.POINTS_PER_SECOND * dt;
        },

        // 无敌帧
        isInvincible() {
            if (!state.isInvincible) return false;
            const elapsed = performance.now() - state.invincibleStartTime;
            return elapsed < Constants.EasterEggAnim.INVINCIBLE_DURATION;
        },

        grantInvincibility() {
            state.isInvincible = true;
            state.invincibleStartTime = performance.now();
        },

        // 彩蛋触发
        triggerEasterEgg(egg) {
            if (state.triggeredEasterEggs.includes(egg.score)) return;
            state.triggeredEasterEggs.push(egg.score);
            state.activeEasterEgg = egg;
            state.easterEggStartTime = performance.now();

            // 给予无敌帧
            this.grantInvincibility();

            // 处理特殊效果
            switch (egg.effect) {
                case 'goldBg':
                    state.bgOverride = Constants.Colors.goldenBg;
                    state.bgOverrideStartTime = performance.now();
                    break;
                case 'slowDown':
                    state.speed = state.baseSpeed * 0.5;
                    break;
                case 'speedUp':
                    state.baseSpeed += 2;
                    state.speed = state.baseSpeed;
                    break;
                case 'unicorn':
                    state.isUnicorn = true;
                    break;
            }

            console.log(`[EasterEgg] Triggered: ${egg.text}`);
        },

        updateEasterEgg() {
            // 检查新彩蛋触发
            for (const egg of Constants.EasterEggConfig) {
                if (state.score >= egg.score && !state.triggeredEasterEggs.includes(egg.score)) {
                    this.triggerEasterEgg(egg);
                    break;
                }
            }

            // 更新光环效果
            for (let i = state.halos.length - 1; i >= 0; i--) {
                const halo = state.halos[i];
                halo.radius += halo.speed;
                halo.alpha -= 0.03;
                if (halo.alpha <= 0) {
                    state.halos.splice(i, 1);
                }
            }

            // 检查金色背景恢复
            if (state.bgOverride) {
                const elapsed = performance.now() - state.bgOverrideStartTime;
                if (elapsed > Constants.EasterEggConfig[0].duration) {
                    state.bgOverride = null;
                }
            }

            // 检查减速恢复
            const activeEgg = state.activeEasterEgg;
            if (activeEgg && activeEgg.effect === 'slowDown') {
                const elapsed = performance.now() - state.easterEggStartTime;
                if (elapsed > activeEgg.duration) {
                    state.speed = state.baseSpeed;
                }
            }
        },

        spawnHalos() {
            const ponyX = Constants.PonyConfig.X;
            const ponyY = state.ponyY;
            for (let i = 0; i < 3; i++) {
                state.halos.push({
                    x: ponyX,
                    y: ponyY,
                    radius: 30 + i * 20,
                    alpha: 1,
                    speed: (80 - 30) / (Constants.EasterEggAnim.SCALE_IN_DURATION / 16) + i * 3
                });
            }
        },

        getHalos() {
            return state.halos;
        },

        getActiveEasterEgg() {
            return state.activeEasterEgg;
        },

        getEasterEggProgress() {
            if (!state.activeEasterEgg) return null;
            const elapsed = performance.now() - state.easterEggStartTime;
            const total = Constants.EasterEggAnim.OVERLAY_DURATION;

            let phase, progress;
            if (elapsed < Constants.EasterEggAnim.SCALE_IN_DURATION) {
                phase = 'scaleIn';
                progress = elapsed / Constants.EasterEggAnim.SCALE_IN_DURATION;
            } else if (elapsed < Constants.EasterEggAnim.SCALE_IN_DURATION + Constants.EasterEggAnim.STAY_DURATION) {
                phase = 'stay';
                progress = 1;
            } else if (elapsed < total) {
                phase = 'fadeOut';
                progress = 1 - (elapsed - Constants.EasterEggAnim.SCALE_IN_DURATION - Constants.EasterEggAnim.STAY_DURATION) / Constants.EasterEggAnim.FADE_OUT_DURATION;
            } else {
                phase = 'end';
                progress = 0;
            }

            return { phase, progress, elapsed };
        },

        getBackgroundColor() {
            return state.bgOverride || Constants.Colors.background;
        },

        getTriggeredEasterEggs() {
            return state.triggeredEasterEggs;
        },

        getSpeed() {
            return state.speed;
        },

        getNextObstacleInterval() {
            return state.nextObstacleInterval;
        },

        setLastObstacleTime(time) {
            state.lastObstacleTime = time;
        },

        getLastObstacleTime() {
            return state.lastObstacleTime;
        },

        // 障碍物相关方法
        addObstacle(obstacle) {
            state.obstacles.push(obstacle);
        },

        getObstacles() {
            return state.obstacles;
        },

        updateObstacles() {
            const speed = state.speed;
            const dt = state.deltaTime;

            for (let i = state.obstacles.length - 1; i >= 0; i--) {
                const obs = state.obstacles[i];
                obs.x -= speed * dt * 60;

                // 更新双栏的第二部分
                if (obs.part2) {
                    obs.part2.x -= speed * dt * 60;
                }

                // 移除超出左边的障碍物
                if (obs.x + obs.width < 0) {
                    state.obstacles.splice(i, 1);
                }
            }
        },

        clearObstacles() {
            state.obstacles = [];
        },

        shouldShowSpeedUp() {
            return state.showSpeedUp;
        },

        checkSpeedUpTimeout() {
            if (state.showSpeedUp) {
                const elapsed = performance.now() - state.speedUpStartTime;
                if (elapsed > 1000) {
                    state.showSpeedUp = false;
                }
            }
        },

        getPonyCollisionBox() {
            const margin = Constants.PonyConfig.COLLISION_MARGIN;
            const size = Constants.PonyConfig.COLLISION_SIZE;
            const ponyX = Constants.PonyConfig.X;

            return {
                x: ponyX - size / 2 + margin,
                y: GameState.get('ponyY') - size / 2 + margin,
                width: size - margin * 2,
                height: size - margin * 2
            };
        },

        // 长按跳跃相关方法
        setJumpKeyDownTime(time) {
            state.jumpKeyDownTime = time;
            state.isJumpingKeyHeld = true;
            state.longJumpApplied = false;
        },

        clearJumpKeyState() {
            state.isJumpingKeyHeld = false;
        },

        applyLongJumpBonus() {
            if (!state.isJumpingKeyHeld || state.longJumpApplied) return;

            const heldTime = performance.now() - state.jumpKeyDownTime;
            if (heldTime > Constants.JumpPhysics.LONG_PRESS_TIME) {
                state.velocityY += Constants.JumpPhysics.LONG_JUMP_BONUS;
                state.longJumpApplied = true;
            }
        },

        // 尘土粒子相关方法
        getDustParticles() {
            return state.dustParticles;
        },

        spawnDustParticles() {
            const ponyX = Constants.PonyConfig.X;
            const groundY = this.getGroundY();

            for (let i = 0; i < 3 + Math.floor(Math.random() * 3); i++) {
                state.dustParticles.push({
                    x: ponyX + (Math.random() - 0.5) * 20,
                    y: groundY - 5,
                    radius: 3 + Math.random() * 4,
                    vx: (Math.random() - 0.5) * 3,
                    vy: -Math.random() * 2,
                    alpha: 0.8
                });
            }
        },

        updateDustParticles() {
            for (let i = state.dustParticles.length - 1; i >= 0; i--) {
                const p = state.dustParticles[i];
                p.x += p.vx;
                p.y += p.vy;
                p.vy += 0.1;
                p.alpha -= 0.03;

                if (p.alpha <= 0) {
                    state.dustParticles.splice(i, 1);
                }
            }
        },

        // ========== 金币相关方法 ==========
        getCoins() {
            return state.coins;
        },

        getCoinCount() {
            return state.coinCount;
        },

        addCoin(coin) {
            state.coins.push(coin);
        },

        removeCoin(index) {
            state.coins.splice(index, 1);
        },

        incrementCoinCount() {
            state.coinCount++;
        },

        resetCoinCount() {
            state.coinCount = 0;
        },

        getLastCoinSpawnTime() {
            return state.lastCoinSpawnTime;
        },

        setLastCoinSpawnTime(time) {
            state.lastCoinSpawnTime = time;
        },

        getNextCoinInterval() {
            return state.nextCoinInterval;
        },

        setNextCoinInterval(interval) {
            state.nextCoinInterval = interval;
        },

        resetCoins() {
            state.coins = [];
            state.coinCount = 0;
            state.lastCoinSpawnTime = 0;
            state.nextCoinInterval = Constants.CoinConfig.SPAWN_MIN_INTERVAL +
                Math.random() * (Constants.CoinConfig.SPAWN_MAX_INTERVAL - Constants.CoinConfig.SPAWN_MIN_INTERVAL);
        },

        // ========== 道具相关方法 ==========
        getPowerUps() {
            return state.powerUps;
        },

        addPowerUp(powerUp) {
            state.powerUps.push(powerUp);
        },

        removePowerUp(index) {
            state.powerUps.splice(index, 1);
        },

        getActivePowerUps() {
            return state.activePowerUps;
        },

        activatePowerUp(type) {
            const config = type === 'speedBoost'
                ? Constants.PowerUpConfig.SPEED_BOOST
                : Constants.PowerUpConfig.BIG_MODE;

            const activePower = state.activePowerUps[type];
            activePower.active = true;
            activePower.timeLeft = config.DURATION;
            activePower.startTime = performance.now();

            // 设置冷却
            if (type === 'speedBoost') {
                state.speedBoostCooldown = config.COOLDOWN;
            } else {
                state.bigModeCooldown = config.COOLDOWN;
            }

            console.log(`[PowerUp] ${type} activated for ${config.DURATION}ms`);
        },

        updateActivePowerUps(dt) {
            // 记录上次状态用于检测结束
            const wasSpeedBoostActive = state.activePowerUps.speedBoost.active;
            const wasBigModeActive = state.activePowerUps.bigMode.active;

            // 更新加速道具
            const speedBoost = state.activePowerUps.speedBoost;
            if (speedBoost.active) {
                speedBoost.timeLeft -= dt * 1000;
                if (speedBoost.timeLeft <= 0) {
                    speedBoost.active = false;
                    speedBoost.timeLeft = 0;
                    // 恢复速度（减去增量）
                    state.speed -= Constants.PowerUpConfig.SPEED_BOOST.SPEED_INCREMENT;
                    console.log('[PowerUp] speedBoost expired, speed restored');
                    // 触发结束特效（在 Effects 模块中处理）
                    state.powerUpEnded = { type: 'speedBoost', justEnded: true };
                }
            }

            // 更新变大道具
            const bigMode = state.activePowerUps.bigMode;
            if (bigMode.active) {
                bigMode.timeLeft -= dt * 1000;
                if (bigMode.timeLeft <= 0) {
                    bigMode.active = false;
                    bigMode.timeLeft = 0;
                    console.log('[PowerUp] bigMode expired');
                    // 触发结束特效
                    state.powerUpEnded = { type: 'bigMode', justEnded: true };
                }
            }

            // 更新冷却时间
            if (state.speedBoostCooldown > 0) {
                state.speedBoostCooldown -= dt * 1000;
            }
            if (state.bigModeCooldown > 0) {
                state.bigModeCooldown -= dt * 1000;
            }

            // 清除结束标记
            if (state.powerUpEnded && state.powerUpEnded.justEnded) {
                state.powerUpEnded.justEnded = false;
            }
        },

        // 获取道具结束状态（一次性）
        consumePowerUpEnded() {
            if (state.powerUpEnded && state.powerUpEnded.justEnded) {
                const type = state.powerUpEnded.type;
                state.powerUpEnded.justEnded = false;
                return type;
            }
            return null;
        },

        isSpeedBoostActive() {
            return state.activePowerUps.speedBoost.active;
        },

        isBigModeActive() {
            return state.activePowerUps.bigMode.active;
        },

        getBigModeProgress() {
            if (!state.activePowerUps.bigMode.active) return 0;
            return state.activePowerUps.bigMode.timeLeft / Constants.PowerUpConfig.BIG_MODE.DURATION;
        },

        isSpeedBoostOnCooldown() {
            return state.speedBoostCooldown > 0;
        },

        isBigModeOnCooldown() {
            return state.bigModeCooldown > 0;
        },

        getLastPowerUpSpawnTime() {
            return state.lastPowerUpSpawnTime;
        },

        setLastPowerUpSpawnTime(time) {
            state.lastPowerUpSpawnTime = time;
        },

        getNextPowerUpInterval() {
            return state.nextPowerUpInterval;
        },

        setNextPowerUpInterval(interval) {
            state.nextPowerUpInterval = interval;
        },

        resetPowerUps() {
            state.powerUps = [];
            state.activePowerUps.speedBoost = { active: false, timeLeft: 0, startTime: 0 };
            state.activePowerUps.bigMode = { active: false, timeLeft: 0, startTime: 0 };
            state.lastPowerUpSpawnTime = 0;
            state.nextPowerUpInterval = Constants.PowerUpConfig.SPAWN_MIN_INTERVAL +
                Math.random() * (Constants.PowerUpConfig.SPAWN_MAX_INTERVAL - Constants.PowerUpConfig.SPAWN_MIN_INTERVAL);
            state.speedBoostCooldown = 0;
            state.bigModeCooldown = 0;
        },

        init() {
            loadHighScore();
        }
    };
})();
