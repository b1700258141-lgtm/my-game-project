/**
 * 视觉润色模块 - 背景层次、装饰、马的视觉效果
 */
const Visual = (function() {
    // ========== 配置 ==========
    const Config = {
        // 视觉模式开关（false时跳过装饰）
        ENABLED: true,

        // 天空渐变
        SKY_TOP: '#87CEEB',      // 浅蓝色
        SKY_BOTTOM: '#f5f0e8',   // 米白色

        // 云朵配置
        CLOUD_COUNT: 3,
        CLOUD_SPEED_RATIO: 0.2,
        CLOUD_COLORS: ['rgba(255, 255, 255, 0.9)', 'rgba(255, 255, 255, 0.8)', 'rgba(255, 255, 255, 0.7)'],

        // 山丘配置
        HILL_SPEED_RATIO: 0.5,
        HILL_COLORS: ['#d4c4a8', '#c9b896', '#bfad85'],
        HILL_HEIGHTS: [180, 140, 100],

        // 地面配置
        GROUND_FILL: '#8B7355',     // 深棕色土地
        GROUND_LINE: '#c4a882',      // 棕色地面线
        GRASS_INTERVAL: 120,          // 小草间距
        GRASS_COLOR: '#6b8e23',      // 橄榄绿色
        GRASS_HEIGHT_MIN: 15,
        GRASS_HEIGHT_MAX: 30,

        // 马视觉
        HOOF_DUST_INTERVAL: 4,         // 马蹄尘点间隔
        HOOF_DUST_COLOR: 'rgba(196, 168, 130, 0.6)',
        AFTERIMAGE_COUNT: 3,
        AFTERIMAGE_ALPHA: 0.3,

        // 对话气泡
        SPEECH_BUBBLE: '来拍我呀～'
    };

    // ========== 状态 ==========
    let clouds = [];
    let hills = [];
    let grass = [];
    let hoofDusts = [];
    let afterimages = [];
    let hillOffset = 0;
    let grassOffset = 0;

    // ========== 初始化 ==========
    function init() {
        initClouds();
        initHills();
        initGrass();
        console.log('[Visual] Module initialized');
    }

    function initClouds() {
        clouds = [];
        const canvas = Renderer.getCanvas();
        for (let i = 0; i < Config.CLOUD_COUNT; i++) {
            clouds.push({
                x: Math.random() * canvas.width,
                y: 60 + Math.random() * 120,
                width: 100 + Math.random() * 80,
                height: 40 + Math.random() * 20,
                color: Config.CLOUD_COLORS[i % Config.CLOUD_COLORS.length]
            });
        }
    }

    function initHills() {
        hills = [];
        const canvas = Renderer.getCanvas();
        const groundY = Pony.getGroundY();

        for (let i = 0; i < 8; i++) {
            hills.push({
                x: i * (canvas.width / 4) - canvas.width / 4,
                width: canvas.width / 2 + 100,
                height: Config.HILL_HEIGHTS[i % Config.HILL_HEIGHTS.length],
                color: Config.HILL_COLORS[i % Config.HILL_COLORS.length],
                y: groundY
            });
        }
    }

    function initGrass() {
        grass = [];
        const canvas = Renderer.getCanvas();
        const groundY = Pony.getGroundY();

        for (let x = 0; x < canvas.width + Config.GRASS_INTERVAL; x += Config.GRASS_INTERVAL) {
            grass.push(createGrass(x));
        }
    }

    function createGrass(x) {
        return {
            x: x,
            height: Config.GRASS_HEIGHT_MIN + Math.random() * (Config.GRASS_HEIGHT_MAX - Config.GRASS_HEIGHT_MIN)
        };
    }

    // ========== 更新 ==========
    function update(dt) {
        if (!Config.ENABLED) return;

        const speed = GameState.getSpeed();

        // 更新云朵（视差）
        updateClouds(speed * Config.CLOUD_SPEED_RATIO * dt);

        // 更新山丘（视差）
        updateHills(speed * Config.HILL_SPEED_RATIO * dt);

        // 更新小草
        updateGrass(speed * dt);

        // 更新马蹄尘点
        updateHoofDusts();

        // 更新残影
        updateAfterimages();
    }

    function updateClouds(deltaX) {
        const canvas = Renderer.getCanvas();
        clouds.forEach(cloud => {
            cloud.x -= deltaX;
            if (cloud.x + cloud.width < 0) {
                cloud.x = canvas.width + Math.random() * 100;
                cloud.y = 60 + Math.random() * 120;
            }
        });
    }

    function updateHills(deltaX) {
        const canvas = Renderer.getCanvas();
        hillOffset -= deltaX;

        hills.forEach(hill => {
            // 计算相对位置
            let relX = hill.x + hillOffset;
            const cycleWidth = canvas.width / 2 + 100;

            // 循环
            if (hillOffset <= -cycleWidth) {
                hillOffset += cycleWidth;
                relX += cycleWidth;
            }
        });
    }

    function updateGrass(deltaX) {
        const canvas = Renderer.getCanvas();
        grassOffset -= deltaX;

        grass.forEach(g => {
            g.x += deltaX;
        });

        // 移除超出左边的草
        while (grass.length > 0 && grass[0].x < -Config.GRASS_INTERVAL) {
            grass.shift();
        }

        // 添加超出右边的草
        const lastGrass = grass[grass.length - 1];
        if (lastGrass && lastGrass.x < canvas.width) {
            const newX = lastGrass.x + Config.GRASS_INTERVAL;
            grass.push(createGrass(newX));
        }
    }

    function updateHoofDusts() {
        const state = GameState.get('ponyState');
        const frameCount = GameState.get('frameCount');

        // 仅在running状态，每隔几帧生成尘点
        if (state === Constants.PonyState.RUNNING && frameCount % Config.HOOF_DUST_INTERVAL === 0) {
            spawnHoofDust();
        }

        // 更新尘点
        for (let i = hoofDusts.length - 1; i >= 0; i--) {
            const dust = hoofDusts[i];
            dust.x -= GameState.getSpeed() * GameState.get('deltaTime');
            dust.alpha -= 0.02;
            dust.y += dust.vy;
            dust.vy += 0.1;

            if (dust.alpha <= 0) {
                hoofDusts.splice(i, 1);
            }
        }
    }

    function spawnHoofDust() {
        const ponyX = Constants.PonyConfig.X;
        const groundY = Pony.getGroundY();

        hoofDusts.push({
            x: ponyX + (Math.random() - 0.5) * 20,
            y: groundY - 5,
            radius: 3 + Math.random() * 3,
            alpha: 0.6,
            vy: -Math.random() * 0.5
        });
    }

    function updateAfterimages() {
        const state = GameState.get('ponyState');
        const ponyY = GameState.get('ponyY');

        // 仅在jumping状态生成残影
        if (state === Constants.PonyState.JUMPING) {
            // 每隔几帧添加新残影
            const frameCount = GameState.get('frameCount');
            if (frameCount % 3 === 0) {
                afterimages.push({
                    x: Constants.PonyConfig.X,
                    y: ponyY,
                    emoji: Pony.getEmoji(),
                    alpha: Config.AFTERIMAGE_ALPHA
                });
            }
        }

        // 更新残影
        for (let i = afterimages.length - 1; i >= 0; i--) {
            const img = afterimages[i];
            img.alpha -= 0.02;
            if (img.alpha <= 0) {
                afterimages.splice(i, 1);
            }
        }
    }

    // ========== 渲染 ==========
    function renderBackground(ctx) {
        if (!Config.ENABLED) {
            // 非视觉模式，只画纯色背景
            ctx.fillStyle = Constants.Colors.background;
            ctx.fillRect(0, 0, Constants.CANVAS_WIDTH, Constants.CANVAS_HEIGHT);
            return;
        }

        // 天空渐变
        const skyGradient = ctx.createLinearGradient(0, 0, 0, Constants.CANVAS_HEIGHT);
        skyGradient.addColorStop(0, Config.SKY_TOP);
        skyGradient.addColorStop(1, Config.SKY_BOTTOM);
        ctx.fillStyle = skyGradient;
        ctx.fillRect(0, 0, Constants.CANVAS_WIDTH, Constants.CANVAS_HEIGHT);
    }

    function renderClouds(ctx) {
        if (!Config.ENABLED) return;

        clouds.forEach(cloud => {
            ctx.save();
            ctx.fillStyle = cloud.color;

            // 绘制云朵（多个椭圆组合）
            const cx = cloud.x;
            const cy = cloud.y;
            const w = cloud.width;
            const h = cloud.height;

            ctx.beginPath();
            ctx.ellipse(cx, cy, w * 0.3, h * 0.5, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.beginPath();
            ctx.ellipse(cx - w * 0.2, cy + h * 0.1, w * 0.25, h * 0.4, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.beginPath();
            ctx.ellipse(cx + w * 0.25, cy + h * 0.05, w * 0.28, h * 0.45, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
        });
    }

    function renderHills(ctx) {
        if (!Config.ENABLED) return;

        const groundY = Pony.getGroundY();

        hills.forEach((hill, index) => {
            const relX = (hill.x + hillOffset) % (Constants.CANVAS_WIDTH + 200);
            const adjustedX = relX < -hill.width / 2 ? relX + Constants.CANVAS_WIDTH + hill.width : relX;

            ctx.save();
            ctx.fillStyle = hill.color;

            // 绘制山丘（半圆弧）
            ctx.beginPath();
            ctx.moveTo(adjustedX - hill.width / 2, groundY);
            ctx.quadraticCurveTo(
                adjustedX, groundY - hill.height,
                adjustedX + hill.width / 2, groundY
            );
            ctx.fill();

            ctx.restore();
        });
    }

    function renderGroundFill(ctx) {
        if (!Config.ENABLED) return;

        const groundY = Pony.getGroundY();
        ctx.fillStyle = Config.GROUND_FILL;
        ctx.fillRect(0, groundY, Constants.CANVAS_WIDTH, Constants.CANVAS_HEIGHT - groundY);
    }

    function renderGrass(ctx) {
        if (!Config.ENABLED) return;

        const groundY = Pony.getGroundY();
        ctx.strokeStyle = Config.GRASS_COLOR;
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';

        grass.forEach(g => {
            if (g.x < -10 || g.x > Constants.CANVAS_WIDTH + 10) return;

            ctx.beginPath();
            ctx.moveTo(g.x, groundY);
            ctx.lineTo(g.x + (Math.random() - 0.5) * 4, groundY - g.height);
            ctx.stroke();
        });
    }

    function renderHoofDusts(ctx) {
        if (!Config.ENABLED) return;

        hoofDusts.forEach(dust => {
            ctx.save();
            ctx.beginPath();
            ctx.arc(dust.x, dust.y, dust.radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(196, 168, 130, ${dust.alpha})`;
            ctx.fill();
            ctx.restore();
        });
    }

    function renderAfterimages(ctx) {
        if (!Config.ENABLED) return;

        ctx.font = `${Constants.PonyConfig.FONT_SIZE}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        afterimages.forEach(img => {
            ctx.save();
            ctx.globalAlpha = img.alpha;
            ctx.translate(img.x, img.y);
            ctx.scale(-1, 1);
            ctx.fillText(img.emoji, 0, 0);
            ctx.restore();
        });
    }

    function renderSpeechBubble(ctx) {
        if (!Config.ENABLED) return;

        const state = GameState.get('ponyState');
        if (state !== Constants.PonyState.IDLE) return;

        const ponyX = Constants.PonyConfig.X;
        const ponyY = GameState.get('ponyY');

        const bubbleX = ponyX + 50;
        const bubbleY = ponyY - 60;
        const bubbleWidth = 160;
        const bubbleHeight = 50;

        // 气泡背景
        ctx.save();
        ctx.fillStyle = 'white';
        ctx.strokeStyle = '#cccccc';
        ctx.lineWidth = 2;

        // 圆角矩形
        const radius = 10;
        ctx.beginPath();
        ctx.moveTo(bubbleX - bubbleWidth / 2 + radius, bubbleY - bubbleHeight / 2);
        ctx.lineTo(bubbleX + bubbleWidth / 2 - radius, bubbleY - bubbleHeight / 2);
        ctx.quadraticCurveTo(bubbleX + bubbleWidth / 2, bubbleY - bubbleHeight / 2, bubbleX + bubbleWidth / 2, bubbleY - bubbleHeight / 2 + radius);
        ctx.lineTo(bubbleX + bubbleWidth / 2, bubbleY + bubbleHeight / 2 - radius);
        ctx.quadraticCurveTo(bubbleX + bubbleWidth / 2, bubbleY + bubbleHeight / 2, bubbleX + bubbleWidth / 2 - radius, bubbleY + bubbleHeight / 2);
        ctx.lineTo(bubbleX - bubbleWidth / 2 + radius, bubbleY + bubbleHeight / 2);
        ctx.quadraticCurveTo(bubbleX - bubbleWidth / 2, bubbleY + bubbleHeight / 2, bubbleX - bubbleWidth / 2, bubbleY + bubbleHeight / 2 - radius);
        ctx.lineTo(bubbleX - bubbleWidth / 2, bubbleY - bubbleHeight / 2 + radius);
        ctx.quadraticCurveTo(bubbleX - bubbleWidth / 2, bubbleY - bubbleHeight / 2, bubbleX - bubbleWidth / 2 + radius, bubbleY - bubbleHeight / 2);
        ctx.fill();
        ctx.stroke();

        // 气泡尾巴（小三角形指向马）
        ctx.beginPath();
        ctx.moveTo(bubbleX - bubbleWidth / 2 - 5, bubbleY + 10);
        ctx.lineTo(bubbleX - bubbleWidth / 2 - 15, bubbleY + 20);
        ctx.lineTo(bubbleX - bubbleWidth / 2 - 5, bubbleY + 20);
        ctx.fillStyle = 'white';
        ctx.fill();
        ctx.stroke();

        // 文字
        ctx.fillStyle = '#333333';
        ctx.font = '20px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(Config.SPEECH_BUBBLE, bubbleX, bubbleY);

        ctx.restore();
    }

    // ========== 导出接口 ==========
    return {
        Config,
        init,
        update,
        renderBackground,
        renderClouds,
        renderHills,
        renderGroundFill,
        renderGrass,
        renderHoofDusts,
        renderAfterimages,
        renderSpeechBubble
    };
})();
