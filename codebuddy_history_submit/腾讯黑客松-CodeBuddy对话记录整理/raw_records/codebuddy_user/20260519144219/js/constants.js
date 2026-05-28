/**
 * 常量配置模块 - 定义游戏全局常量
 */
const Constants = (function() {
    // Canvas 配置
    const CANVAS_WIDTH = 1920;
    const CANVAS_HEIGHT = 1080;
    const BACKGROUND_COLOR = '#f5f0e8';

    // 游戏状态
    const GameStatus = {
        IDLE: 'idle',
        PLAYING: 'playing',
        PAUSED: 'paused',
        GAME_OVER: 'gameOver'
    };

    // 马的配置
    const PonyConfig = {
        X: 120,
        FONT_SIZE: 48,
        GROUND_OFFSET: 80,
        SHAKE_DURATION: 500,
        RUN_FRAME_INTERVAL: 8,
        VISUAL_HEIGHT: 40,
        COLLISION_SIZE: 48,
        COLLISION_MARGIN: 8
    };

    // 跳跃物理参数
    const JumpPhysics = {
        GRAVITY: 0.6,
        JUMP_FORCE: -14,
        LONG_JUMP_BONUS: -4,
        LONG_PRESS_TIME: 150
    };

    // 马的状态
    const PonyState = {
        IDLE: 'idle',
        RUNNING: 'running',
        JUMPING: 'jumping',
        DEAD: 'dead'
    };

    // 障碍物配置
    const ObstacleConfig = {
        LOW_BAR: 'lowBar',
        HIGH_BAR: 'highBar',
        DOUBLE_BAR: 'doubleBar',
        LOW_WIDTH: 20,
        LOW_HEIGHT: 40,
        HIGH_WIDTH: 20,
        HIGH_HEIGHT: 70,
        DOUBLE_SPACING: 60,
        INITIAL_SPEED: 5,
        MIN_INTERVAL: 1200,
        MAX_INTERVAL: 2000,
        MIN_INTERVAL_LIMIT: 700,
        SPEED_INCREMENT: 0.5,
        SPEED_MAX: 14,
        INTERVAL_DECREMENT: 80,
        SCORE_THRESHOLD: 200
    };

    // 颜色配置
    const Colors = {
        background: BACKGROUND_COLOR,
        text: '#333333',
        accent: '#e67e22',
        ground: '#c4a882',
        shadow: 'rgba(0, 0, 0, 0.2)',
        dust: '#c4a882',
        lowBar: '#8B4513',
        highBar: '#4169E1',
        barTop: '#5a3a1a',
        debugCollision: '#ff0000',
        overlay: 'rgba(0, 0, 0, 0.7)',
        skull: '#c0392b',
        // 彩蛋颜色
        gold: '#FFD700',
        goldenBg: '#FFF8DC',
        lightning: '#FFFF00',
        compass: '#8B4513',
        wave: '#4169E1',
        unicorn: '#FF69B4'
    };

    // 调试配置
    const Debug = {
        ENABLED: true,
        SHOW_COLLISION_BOX: false,
        POSITION: { x: 20, y: 30 }
    };

    // 视觉模式开关（false时跳过装饰）
    const VISUAL_MODE = true;

    // 死亡抖动配置
    const DeathShake = {
        DURATION: 500,
        FRAME_COUNT: 10,
        AMPLITUDE: 12
    };

    // 结算界面配置
    const GameOverScreen = {
        SHOW_DELAY: 800
    };

    // 计分配置
    const ScoreConfig = {
        POINTS_PER_SECOND: 10  // 每秒10分
    };

    // 成语彩蛋配置
    const EasterEggConfig = [
        {
            score: 100,
            text: '马到成功！',
            emoji: '🎊',
            effect: 'goldBg',
            duration: 1000
        },
        {
            score: 300,
            text: '一马当先！',
            emoji: '⚡',
            effect: 'halo',
            duration: 600
        },
        {
            score: 600,
            text: '老马识途！',
            emoji: '🧭',
            effect: 'slowDown',
            duration: 2000
        },
        {
            score: 1000,
            text: '万马奔腾！',
            emoji: '🌊',
            effect: 'speedUp',
            duration: 0
        },
        {
            score: 2000,
            text: '天马行空！',
            emoji: '✨',
            effect: 'unicorn',
            duration: 0
        }
    ];

    // 彩蛋动画配置
    const EasterEggAnim = {
        OVERLAY_DURATION: 1200,      // 遮罩持续时间
        SCALE_IN_DURATION: 400,      // 放大动画时长
        STAY_DURATION: 500,          // 停留时长
        FADE_OUT_DURATION: 300,      // 淡出时长
        INVINCIBLE_DURATION: 500     // 无敌帧时长
    };

    // 金币配置
    const CoinConfig = {
        RADIUS: 12,                  // 金币半径
        COLOR: '#FFD700',             // 金币颜色
        SYMBOL: '¥',                 // 金币符号
        SYMBOL_COLOR: 'white',        // 符号颜色
        SYMBOL_SIZE: 12,             // 符号字号
        MIN_Y_OFFSET: 30,            // 最小Y偏移（距地面）
        MAX_Y_OFFSET: 90,            // 最大Y偏移
        SPAWN_MIN_INTERVAL: 800,      // 生成间隔最小值(ms)
        SPAWN_MAX_INTERVAL: 1400,     // 生成间隔最大值(ms)
        MIN_DISTANCE: 80,            // 与障碍物最小间距
        MAX_COINS: 5,                // 同屏最多金币数
        SCORE_VALUE: 10,             // 每个金币分数
        COLLECT_ANIM_DURATION: 600,  // 收集动画时长(ms)
        DISAPPEAR_ANIM_FRAMES: 3     // 消失动画帧数
    };

    // 道具配置
    const PowerUpConfig = {
        // 通用配置
        SIZE: 24,                     // 道具尺寸
        MIN_Y_OFFSET: 40,            // 漂浮最小高度
        MAX_Y_OFFSET: 100,           // 漂浮最大高度
        SPAWN_MIN_INTERVAL: 2000,    // 生成间隔最小值(ms)
        SPAWN_MAX_INTERVAL: 3500,    // 生成间隔最大值(ms)

        // 加速蹄铁 🧲
        SPEED_BOOST: {
            TYPE: 'speedBoost',
            NAME: 'speedBoost',
            COLOR: '#1E90FF',         // 深蓝色
            SYMBOL: '⚡',
            DURATION: 5000,           // 持续5秒
            COOLDOWN: 8000,           // 冷却8秒
            SPEED_INCREMENT: 3       // 速度增量
        },

        // 变大道具
        BIG_MODE: {
            TYPE: 'bigMode',
            NAME: 'bigMode',
            COLOR: '#DC143C',         // 红色
            SYMBOL: '大',
            DURATION: 4000,           // 持续4秒
            COOLDOWN: 10000,          // 冷却10秒
            SIZE_MULTIPLIER: 1.5      // 字号放大倍数
        }
    };

    // 特效配置
    const EffectsConfig = {
        ENABLED: true,               // 总开关

        // 金币粒子特效
        COIN_PARTICLES: {
            COUNT: 6,                 // 粒子数量
            COLOR: '#FFD700',          // 金色
            DURATION: 400,           // 持续时间(ms)
            SPEED: 150,              // 扩散速度
            SIZE: 6                  // 粒子大小
        },

        // 加速闪电残影
        SPEED_TRAIL: {
            DURATION: 500,            // 持续时间
            COLOR: '#1E90FF',         // 蓝色
            COUNT: 5                 // 残影数量
        },

        // 变大光晕
        BIG_GLOW: {
            COLOR: '#32CD32',         // 绿色
            MIN_RADIUS: 50,           // 最小半径
            MAX_RADIUS: 80,           // 最大半径
            BREATH_SPEED: 0.003       // 呼吸速度
        },

        // 缩放动画
        SCALE_ANIM: {
            OVERSHOOT: 1.3,           // 超出比例
            DURATION: 300             // 动画时长
        },

        // 通知系统
        NOTIFICATION: {
            WIDTH: 200,              // 宽度
            HEIGHT: 36,              // 高度
            DURATION: 800,           // 停留时长(ms)
            SLIDE_SPEED: 300,        // 滑入滑出速度(ms)
            MAX_VISIBLE: 3,          // 最多同时显示
            MARGIN: 10               // 间距
        },

        // 道具栏
        POWERUP_BAR: {
            X: 20,                   // 左下角X
            Y: Constants.CANVAS_HEIGHT - 80, // 左下角Y
            WIDTH: 150,             // 宽度
            HEIGHT: 60,              // 高度
            ICON_SIZE: 24,          // 图标大小
            BAR_WIDTH: 100,          // 进度条宽度
            BAR_HEIGHT: 8,           // 进度条高度
            WARNING_TIME: 1000       // 警告阈值(ms)
        }
    };

    return {
        CANVAS_WIDTH,
        CANVAS_HEIGHT,
        BACKGROUND_COLOR,
        GameStatus,
        PonyConfig,
        JumpPhysics,
        PonyState,
        ObstacleConfig,
        Colors,
        Debug,
        DeathShake,
        GameOverScreen,
        ScoreConfig,
        EasterEggConfig,
        EasterEggAnim,
        VISUAL_MODE,
        CoinConfig,
        PowerUpConfig,
        EffectsConfig
    };
})();
