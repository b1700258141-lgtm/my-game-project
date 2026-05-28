/**
 * 碰撞检测模块 - AABB 矩形碰撞检测
 */
const Collision = (function() {
    // AABB 碰撞检测
    function checkAABB(rect1, rect2) {
        return rect1.x < rect2.x + rect2.width &&
               rect1.x + rect1.width > rect2.x &&
               rect1.y < rect2.y + rect2.height &&
               rect1.y + rect1.height > rect2.y;
    }

    // 检测马与所有障碍物的碰撞
    function checkPonyObstacleCollision() {
        if (!GameState.isPlaying()) return false;
        if (GameState.get('ponyState') === Constants.PonyState.DEAD) return false;

        let ponyBox = GameState.getPonyCollisionBox();

        // 如果是变大状态，放大碰撞箱
        if (GameState.isBigModeActive()) {
            const scale = Constants.PowerUpConfig.BIG_MODE.SIZE_MULTIPLIER;
            const centerX = ponyBox.x + ponyBox.width / 2;
            const centerY = ponyBox.y + ponyBox.height / 2;
            ponyBox = {
                x: centerX - (ponyBox.width * scale) / 2,
                y: centerY - (ponyBox.height * scale) / 2,
                width: ponyBox.width * scale,
                height: ponyBox.height * scale
            };
        }

        const obstacles = GameState.getObstacles();

        for (const obs of obstacles) {
            const obsBox = {
                x: obs.x,
                y: obs.y,
                width: obs.width,
                height: obs.height
            };

            if (checkAABB(ponyBox, obsBox)) {
                console.log(`[Collision] Hit detected! Pony:`, ponyBox, 'Obstacle:', obsBox);
                return true;
            }

            // 检测双栏的第二部分
            if (obs.part2) {
                const obs2Box = {
                    x: obs.part2.x,
                    y: obs.part2.y,
                    width: obs.part2.width,
                    height: obs.part2.height
                };

                if (checkAABB(ponyBox, obs2Box)) {
                    console.log(`[Collision] Hit detected with double bar part 2!`);
                    return true;
                }
            }
        }

        return false;
    }

    // 渲染调试碰撞箱
    function renderDebugBoxes(ctx) {
        if (!Constants.Debug.SHOW_COLLISION_BOX) return;

        // 马的碰撞箱
        const ponyBox = GameState.getPonyCollisionBox();
        ctx.save();
        ctx.strokeStyle = Constants.Colors.debugCollision;
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(ponyBox.x, ponyBox.y, ponyBox.width, ponyBox.height);
        ctx.setLineDash([]);
        ctx.restore();

        // 障碍物碰撞箱
        const obstacles = GameState.getObstacles();
        ctx.save();
        ctx.strokeStyle = Constants.Colors.debugCollision;
        ctx.lineWidth = 2;

        obstacles.forEach(obs => {
            ctx.strokeRect(obs.x, obs.y, obs.width, obs.height);
            if (obs.part2) {
                ctx.strokeRect(obs.part2.x, obs.part2.y, obs.part2.width, obs.part2.height);
            }
        });

        ctx.restore();
    }

    return {
        checkAABB,
        checkPonyObstacleCollision,
        renderDebugBoxes
    };
})();
