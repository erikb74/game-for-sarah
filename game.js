// Boot Scene
class BootScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BootScene' });
    }

    preload() {
        // Create loading text
        const loadingText = this.add.text(200, 300, 'Loading...', {
            fontSize: '32px',
            fill: '#ffffff'
        }).setOrigin(0.5);
    }

    create() {
        // Move to main menu after a brief moment
        this.time.delayedCall(100, () => {
            this.scene.start('MainMenuScene');
        });
    }
}

// Main Menu Scene
class MainMenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MainMenuScene' });
    }

    create() {
        // Sky background
        const skyGradient = this.add.graphics();
        skyGradient.fillGradientStyle(0x87ceeb, 0x87ceeb, 0xe0f6ff, 0xe0f6ff, 1);
        skyGradient.fillRect(0, 0, 400, 600);

        // Title
        const titleDog = this.add.text(200, 150, '🐕', {
            fontSize: '100px'
        }).setOrigin(0.5);
        titleDog.setScale(-1, 1); // Flip horizontally to face right

        this.add.text(200, 250, 'Flappy Bird', {
            fontSize: '48px',
            fill: '#ffffff',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);

        // Instructions
        this.add.text(200, 350, 'Click or Press SPACE to Flap', {
            fontSize: '20px',
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5);

        const startText = this.add.text(200, 450, 'Click to Start', {
            fontSize: '32px',
            fill: '#ffff00',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);

        // Pulsing animation
        this.tweens.add({
            targets: startText,
            scale: 1.1,
            duration: 500,
            yoyo: true,
            repeat: -1
        });

        // Start game on click or space
        this.input.on('pointerdown', () => this.startGame());
        this.input.keyboard.on('keydown-SPACE', () => this.startGame());
    }

    startGame() {
        this.scene.start('PlayScene');
    }
}

// Play Scene
class PlayScene extends Phaser.Scene {
    constructor() {
        super({ key: 'PlayScene' });
    }

    create() {
        // Game state
        this.gameOver = false;
        this.score = 0;
        this.gameStarted = false;

        // Sky background
        this.skyGradient = this.add.graphics();
        this.skyGradient.fillGradientStyle(0x87ceeb, 0x87ceeb, 0xe0f6ff, 0xe0f6ff, 1);
        this.skyGradient.fillRect(0, 0, 400, 600);

        // Scrolling clouds for background effect
        this.clouds = [];
        for (let i = 0; i < 5; i++) {
            const cloud = this.add.text(
                Phaser.Math.Between(0, 400),
                Phaser.Math.Between(50, 300),
                '☁️',
                { fontSize: '40px' }
            );
            cloud.setDepth(1);
            cloud.scrollSpeed = Phaser.Math.Between(0.3, 0.8);
            this.clouds.push(cloud);
        }

        // Ground
        this.ground = this.add.rectangle(200, 580, 400, 40, 0x8b4513);
        this.physics.add.existing(this.ground, true);

        // Bird - using emoji as text
        this.bird = this.add.text(100, 300, '🐕', {
            fontSize: '40px'
        }).setOrigin(0.5);
        this.bird.setScale(-1, 1); // Flip horizontally to face right
        this.bird.setDepth(20); // Above pipes
        this.physics.add.existing(this.bird);
        this.bird.body.setSize(40, 40);
        this.bird.body.setCollideWorldBounds(true);

        // Pipes group
        this.pipes = this.physics.add.group();

        // Score text
        this.scoreText = this.add.text(200, 50, '0', {
            fontSize: '64px',
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);
        this.scoreText.setDepth(100); // Always on top

        // Ready text
        this.readyText = this.add.text(200, 250, 'Click or Press SPACE\nto Start!', {
            fontSize: '28px',
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4,
            align: 'center'
        }).setOrigin(0.5);
        this.readyText.setDepth(100); // Always on top

        // Input handlers
        this.input.on('pointerdown', () => this.flap());
        this.input.keyboard.on('keydown-SPACE', () => this.flap());

        // Pipe spawn timer (will start after first flap)
        this.pipeTimer = null;
    }

    flap() {
        if (this.gameOver) return;

        // Start game on first flap
        if (!this.gameStarted) {
            console.log('Game starting! Initializing pipe spawning...');
            this.gameStarted = true;
            this.readyText.setVisible(false);
            this.bird.body.setGravity(0, 1000);

            // Start spawning pipes with slower interval for more manageable difficulty
            this.pipeTimer = this.time.addEvent({
                delay: 2200,
                callback: this.spawnPipe,
                callbackScope: this,
                loop: true
            });

            // Spawn first pipe immediately
            console.log('Spawning first pipe...');
            this.spawnPipe();
        }

        // Make bird flap
        this.bird.body.setVelocityY(-350);

        // Rotate bird
        this.tweens.add({
            targets: this.bird,
            angle: -20,
            duration: 100
        });
    }

    spawnPipe() {
        if (this.gameOver) return;

        const gapSize = 150;
        const pipeEmoji = '🌳'; // Using tree emoji for pipes
        const emojiSize = 50;

        // Progressive difficulty based on score
        let pipeType;

        // ALWAYS make the first pipe come from bottom (easier start after tap-to-start)
        if (this.score === 0 && this.pipes.children.size === 0) {
            pipeType = 'bottom';
            console.log('First pipe: forcing bottom pipe for fair start');
        } else if (this.score < 3) {
            // Score 0-2: Only single pipes (top OR bottom)
            pipeType = Phaser.Math.Between(0, 1) === 0 ? 'top' : 'bottom';
        } else if (this.score < 7) {
            // Score 3-6: Mix of single and double pipes
            const rand = Phaser.Math.Between(0, 2);
            pipeType = rand === 0 ? 'top' : (rand === 1 ? 'bottom' : 'both');
        } else {
            // Score 7+: Mostly double pipes with occasional single
            pipeType = Phaser.Math.Between(0, 4) < 3 ? 'both' : (Phaser.Math.Between(0, 1) === 0 ? 'top' : 'bottom');
        }

        const gapY = Phaser.Math.Between(150, 400);
        console.log(`Spawning ${pipeType} pipe(s) at gapY: ${gapY}, score: ${this.score}`);

        // Create top pipe if needed
        if (pipeType === 'top' || pipeType === 'both') {
            const topPipeHeight = pipeType === 'both' ? (gapY - gapSize/2) : Phaser.Math.Between(200, 400);
            const topEmojiCount = Math.ceil(topPipeHeight / emojiSize);

            for (let i = 0; i < topEmojiCount; i++) {
                const pipeSegment = this.add.text(450, i * emojiSize + 25, pipeEmoji, {
                    fontSize: `${emojiSize}px`
                }).setOrigin(0.5);
                pipeSegment.setDepth(10);
                this.physics.add.existing(pipeSegment);
                pipeSegment.body.setAllowGravity(false);
                pipeSegment.body.setImmovable(true);
                pipeSegment.body.setSize(emojiSize, emojiSize);

                // Mark only the first segment for scoring
                if (i === 0) {
                    pipeSegment.scored = false;
                } else {
                    pipeSegment.scored = true;
                }

                this.pipes.add(pipeSegment);
            }
            console.log(`Created top pipe with ${topEmojiCount} segments`);
        }

        // Create bottom pipe if needed
        if (pipeType === 'bottom' || pipeType === 'both') {
            const bottomPipeStart = pipeType === 'both' ? (gapY + gapSize/2) : Phaser.Math.Between(100, 300);
            const bottomEmojiCount = Math.ceil((560 - bottomPipeStart) / emojiSize);

            for (let i = 0; i < bottomEmojiCount; i++) {
                const pipeSegment = this.add.text(450, bottomPipeStart + i * emojiSize + 25, pipeEmoji, {
                    fontSize: `${emojiSize}px`
                }).setOrigin(0.5);
                pipeSegment.setDepth(10);
                this.physics.add.existing(pipeSegment);
                pipeSegment.body.setAllowGravity(false);
                pipeSegment.body.setImmovable(true);
                pipeSegment.body.setSize(emojiSize, emojiSize);

                // For single bottom pipes or double pipes, handle scoring
                if (pipeType === 'bottom' && i === 0) {
                    pipeSegment.scored = false;
                } else {
                    pipeSegment.scored = true;
                }

                this.pipes.add(pipeSegment);
            }
            console.log(`Created bottom pipe with ${bottomEmojiCount} segments`);
        }

        console.log(`Total pipes in group: ${this.pipes.children.size}`);
    }

    update() {
        if (this.gameOver) return;

        // Always scroll clouds for background effect
        this.clouds.forEach(cloud => {
            cloud.x -= cloud.scrollSpeed;
            // Wrap around when cloud goes off screen
            if (cloud.x < -50) {
                cloud.x = 450;
                cloud.y = Phaser.Math.Between(50, 300);
            }
        });

        if (this.gameStarted) {
            // Manually move pipes at a slower, more manageable speed
            this.pipes.children.entries.forEach(pipe => {
                pipe.x -= 1.5; // Move left at ~90 pixels per second (1.5 * 60fps) - slower and more fair
                if (pipe.body) {
                    pipe.body.updateFromGameObject(); // Sync physics body with sprite position
                }
            });

            // Log pipe info every 60 frames (roughly once per second)
            if (this.game.loop.frame % 60 === 0 && this.pipes.children.size > 0) {
                console.log(`Active pipes: ${this.pipes.children.size}`);
                this.pipes.children.entries.forEach((pipe, i) => {
                    console.log(`  Pipe ${i}: x=${pipe.x.toFixed(1)}, y=${pipe.y}, visible=${pipe.visible}`);
                });
            }

            // Rotate bird based on velocity
            if (this.bird.body.velocity.y > 0) {
                this.tweens.add({
                    targets: this.bird,
                    angle: 90,
                    duration: 200
                });
            }

            // Check collision with pipes
            this.physics.overlap(this.bird, this.pipes, () => {
                this.endGame();
            });

            // Check collision with ground
            if (this.bird.y >= 560) {
                this.endGame();
            }

            // Check if bird went off top
            if (this.bird.y <= 0) {
                this.endGame();
            }

            // Update score and remove off-screen pipes
            this.pipes.children.entries.forEach(pipe => {
                if (pipe.x < this.bird.x && !pipe.scored) {
                    pipe.scored = true;
                    this.score++;
                    this.scoreText.setText(this.score);
                }

                if (pipe.x < -50) {
                    console.log(`Destroying off-screen pipe at x=${pipe.x}`);
                    pipe.destroy();
                }
            });
        }
    }

    endGame() {
        if (this.gameOver) return;

        this.gameOver = true;
        this.bird.body.setVelocity(0, 0);
        this.bird.body.setGravity(0, 0);

        // Stop pipe timer
        if (this.pipeTimer) {
            this.pipeTimer.destroy();
        }

        // Stop all pipes
        this.pipes.children.entries.forEach(pipe => {
            pipe.body.setVelocity(0, 0);
        });

        // Transition to game over scene
        this.time.delayedCall(500, () => {
            this.scene.start('GameOverScene', { score: this.score });
        });
    }
}

// Game Over Scene
class GameOverScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameOverScene' });
    }

    init(data) {
        this.finalScore = data.score || 0;
    }

    create() {
        // Sky background
        const skyGradient = this.add.graphics();
        skyGradient.fillGradientStyle(0x87ceeb, 0x87ceeb, 0xe0f6ff, 0xe0f6ff, 1);
        skyGradient.fillRect(0, 0, 400, 600);

        // Game Over text
        this.add.text(200, 150, 'Game Over!', {
            fontSize: '48px',
            fill: '#ff0000',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 6
        }).setOrigin(0.5);

        // Sad emoji
        this.add.text(200, 230, '😢', {
            fontSize: '64px'
        }).setOrigin(0.5);

        // Score display
        this.add.text(200, 320, 'Score', {
            fontSize: '32px',
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);

        this.add.text(200, 370, this.finalScore.toString(), {
            fontSize: '64px',
            fill: '#ffff00',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 6
        }).setOrigin(0.5);

        // Restart button
        const restartText = this.add.text(200, 480, 'Click to Restart', {
            fontSize: '32px',
            fill: '#00ff00',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);

        // Pulsing animation
        this.tweens.add({
            targets: restartText,
            scale: 1.1,
            duration: 500,
            yoyo: true,
            repeat: -1
        });

        // Restart on click
        this.input.on('pointerdown', () => this.restartGame());
        this.input.keyboard.on('keydown-SPACE', () => this.restartGame());
    }

    restartGame() {
        this.scene.start('PlayScene');
    }
}

// Game Configuration
const config = {
    type: Phaser.AUTO,
    width: 400,
    height: 600,
    parent: 'game-container',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false // Disable debug mode for clean visuals
        }
    },
    scene: [BootScene, MainMenuScene, PlayScene, GameOverScene]
};

// Initialize the game
const game = new Phaser.Game(config);
