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
        this.add.text(200, 150, '🐦', {
            fontSize: '100px'
        }).setOrigin(0.5);

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

        // Ground
        this.ground = this.add.rectangle(200, 580, 400, 40, 0x8b4513);
        this.physics.add.existing(this.ground, true);

        // Bird - using emoji as text
        this.bird = this.add.text(100, 300, '🐦', {
            fontSize: '40px'
        }).setOrigin(0.5);
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

        // Ready text
        this.readyText = this.add.text(200, 250, 'Click or Press SPACE\nto Start!', {
            fontSize: '28px',
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4,
            align: 'center'
        }).setOrigin(0.5);

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
            this.gameStarted = true;
            this.readyText.setVisible(false);
            this.bird.body.setGravity(0, 1000);

            // Start spawning pipes
            this.pipeTimer = this.time.addEvent({
                delay: 1800,
                callback: this.spawnPipe,
                callbackScope: this,
                loop: true
            });

            // Spawn first pipe
            this.time.delayedCall(1000, () => this.spawnPipe());
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

        const gapY = Phaser.Math.Between(150, 400);
        const gapSize = 150;

        // Top pipe
        const topPipe = this.add.text(450, gapY - gapSize/2, '🟩', {
            fontSize: '60px'
        }).setOrigin(0.5, 1);

        this.physics.add.existing(topPipe);
        topPipe.body.setSize(60, gapY - gapSize/2);
        topPipe.body.setOffset(-5, -(gapY - gapSize/2));
        topPipe.body.setAllowGravity(false);
        topPipe.body.setVelocityX(-150);
        topPipe.scored = false;
        this.pipes.add(topPipe);

        // Create visual column for top pipe
        for (let i = 1; i < Math.floor((gapY - gapSize/2) / 60); i++) {
            const pipePart = this.add.text(450, gapY - gapSize/2 - (i * 60), '🟩', {
                fontSize: '60px'
            }).setOrigin(0.5, 1);
            this.physics.add.existing(pipePart);
            pipePart.body.setAllowGravity(false);
            pipePart.body.setVelocityX(-150);
            this.pipes.add(pipePart);
        }

        // Bottom pipe
        const bottomPipe = this.add.text(450, gapY + gapSize/2, '🟩', {
            fontSize: '60px'
        }).setOrigin(0.5, 0);

        this.physics.add.existing(bottomPipe);
        bottomPipe.body.setSize(60, 600 - (gapY + gapSize/2));
        bottomPipe.body.setOffset(-5, 0);
        bottomPipe.body.setAllowGravity(false);
        bottomPipe.body.setVelocityX(-150);
        this.pipes.add(bottomPipe);

        // Create visual column for bottom pipe
        for (let i = 1; i < Math.floor((560 - (gapY + gapSize/2)) / 60); i++) {
            const pipePart = this.add.text(450, gapY + gapSize/2 + (i * 60), '🟩', {
                fontSize: '60px'
            }).setOrigin(0.5, 0);
            this.physics.add.existing(pipePart);
            pipePart.body.setAllowGravity(false);
            pipePart.body.setVelocityX(-150);
            this.pipes.add(pipePart);
        }
    }

    update() {
        if (this.gameOver) return;

        if (this.gameStarted) {
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
            debug: false
        }
    },
    scene: [BootScene, MainMenuScene, PlayScene, GameOverScene]
};

// Initialize the game
const game = new Phaser.Game(config);
