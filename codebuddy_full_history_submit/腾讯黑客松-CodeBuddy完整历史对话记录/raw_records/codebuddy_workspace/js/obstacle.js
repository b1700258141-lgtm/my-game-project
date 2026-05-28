/**
 * 障碍物模块 - 生成和移动障碍物
 */
const Obstacle = (function() {
    // 根据权重随机选择障碍物类型
    function randomType() {
        const rand = Math.random() * 100;
        if (rand < 60) {
            return Constants.ObstacleConfig.LOW_BAR;      // 60%
        } else if (rand < 85) {
            return Constants.ObstacleConfig.HIGH_BAR;      // 25%
        } else {
            return Constants.ObstacleConfig.DOUBLE_BAR;    // 15%
        }
    }

    // 创建单个障碍物
    function createObstacle(type, startX) {
        const footY = GameState.getPonyFootY();

        if (type === Constants.ObstacleConfig.LOW_BAR) {
            return {
                type: type,
                x: startX,
                y: footY - Constants.ObstacleConfig.LOW_HEIGHT,
                width: Constants.ObstacleConfig.LOW_WIDTH,
                height: Constants.ObstacleConfig.LOW_HEIGHT,
                color: Constants.Colors.lowBar
            };
        } else if (type === Constants.ObstacleConfig.HIGH_BAR) {
            return {
                type: type,
                x: startX,
                y: footY - Constants.ObstacleConfig.HIGH_HEIGHT,
                width: Constants.ObstacleConfig.HIGH_WIDTH,
                height: Constants.ObstacleConfig.HIGH_HEIGHT,
                color: Constants.Colors.highBar
            };
        } else { // DOUBLE_BAR
            const first = {
                type: type,
                x: startX,
                y: footY - Constants.ObstacleConfig.LOW_HEIGHT,
                width: Constants.ObstacleConfig.LOW_WIDTH,
                height: Constants.ObstacleConfig.LOW_HEIGHT,
                color: Constants.Colors.lowBar
            };
            const second = {
                type: 'lowBarPart2',
                x: startX + Constants.ObstacleConfig.LOW_WIDTH + Constants.ObstacleConfig.DOUBLE_SPACING,
                y: footY - Constants.ObstacleConfig.LOW_HEIGHT,
                width: Constants.ObstacleConfig.LOW_WIDTH,
                height: Constants.ObstacleConfig.LOW_HEIGHT,
                color: Constants.Colors.lowBar
            };
            first.part2 = second;
            return first;
        }
    }

    // 生成新障碍物
    function spawn() {
        const startX = Constants.CANVAS_WIDTH;
        const type = randomType();
        const obstacle = createObstacle(type, startX);
        GameState.addObstacle(obstacle);
        console.log(`[Obstacle] Spawned: ${type} at x=${startX}`);
    }

    // 更新障碍物（生成逻辑）
    function update(timestamp) {
        if (!GameState.isPlaying()) return;

        const lastTime = GameState.getLastObstacleTime();
        const interval = GameState.getNextObstacleInterval();

        if (lastTime === 0 || timestamp - lastTime >= interval) {
            spawn();
            GameState.setLastObstacleTime(timestamp);

            // 更新下一次生成间隔（加入随机）
            const newInterval = interval + (Math.random() - 0.5) * 200;
            GameState.set('nextObstacleInterval', Math.max(newInterval, Constants.ObstacleConfig.MIN_INTERVAL_LIMIT));
        }

        // 更新障碍物移动
        GameState.updateObstacles();
    }

    // 渲染单个障碍物
    function renderSingle(ctx, obs) {
        ctx.save();

        // 主体矩形
        ctx.fillStyle = obs.color;
        ctx.fillRect(obs.x, obs.y, obs.width, obs.height);

        // 顶部横条
        ctx.fillStyle = Constants.Colors.barTop;
        ctx.fillRect(obs.x - 3, obs.y, obs.width + 6, 6);

        // 阴影效果
        ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.fillRect(obs.x + obs.width - 3, obs.y, 3, obs.height);

        ctx.restore();
    }

    // 渲染所有障碍物
    function render(ctx) {
        const obstacles = GameState.getObstacles();
        obstacles.forEach(obs => {
            renderSingle(ctx, obs);
            // 双栏的第二个
            if (obs.part2) {
                renderSingle(ctx, obs.part2);
            }
        });
    }

    return {
        update,
        render,
        spawn
    };
})();
