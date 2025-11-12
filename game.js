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

        this.add.text(200, 250, "Sarah's Game", {
            fontSize: '48px',
            fill: '#ffffff',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);

        // High Score display
        const highScore = this.getHighScore();
        this.add.text(200, 320, `High Score: ${highScore}`, {
            fontSize: '24px',
            fill: '#ffff00',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5);

        // Instructions
        this.add.text(200, 370, 'Click or Press SPACE to Flap', {
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

    getHighScore() {
        const saved = localStorage.getItem('sarahsGameHighScore');
        return saved ? parseInt(saved) : 0;
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

        // Load debug mode setting
        this.debugMode = localStorage.getItem('sarahsGameDebugMode') === 'true';
        if (this.debugMode) {
            this.physics.world.createDebugGraphic();
        }

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
        this.bird.body.setSize(28, 28); // Tighter hitbox - about 70% of emoji size
        // For flipped sprite, need negative offset to move hitbox left
        // The flip inverts the offset direction
        this.bird.body.setOffset(-6, 6); // Negative X to compensate for flip
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

        // Pause button
        this.pauseButton = this.add.text(370, 20, '⏸️', {
            fontSize: '32px'
        }).setOrigin(0.5);
        this.pauseButton.setDepth(100);
        this.pauseButton.setVisible(false); // Hidden until game starts
        this.pauseButton.setInteractive({ useHandCursor: true });
        this.pauseButton.on('pointerdown', () => this.showPauseMenu());

        // Ready text
        this.readyText = this.add.text(200, 250, 'Click or Press SPACE\nto Start!', {
            fontSize: '28px',
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4,
            align: 'center'
        }).setOrigin(0.5);
        this.readyText.setDepth(100); // Always on top

        // Pause menu (hidden by default)
        this.isPaused = false;
        this.createPauseMenu();

        // Input handlers
        this.input.on('pointerdown', (pointer) => {
            if (!this.isPaused) {
                this.flap();
            }
        });
        this.input.keyboard.on('keydown-SPACE', () => {
            if (!this.isPaused) {
                this.flap();
            }
        });
        this.input.keyboard.on('keydown-ESC', () => {
            if (this.gameStarted && !this.gameOver) {
                if (this.isPaused) {
                    this.resumeGame();
                } else {
                    this.showPauseMenu();
                }
            }
        });

        // Pipe spawn timer (will start after first flap)
        this.pipeTimer = null;
    }

    createPauseMenu() {
        // Semi-transparent overlay
        this.pauseOverlay = this.add.rectangle(200, 300, 400, 600, 0x000000, 0.7);
        this.pauseOverlay.setDepth(200);
        this.pauseOverlay.setVisible(false);

        // Pause title
        this.pauseTitle = this.add.text(200, 180, 'PAUSED', {
            fontSize: '48px',
            fill: '#ffffff',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 6
        }).setOrigin(0.5);
        this.pauseTitle.setDepth(201);
        this.pauseTitle.setVisible(false);

        // Resume button
        this.resumeButton = this.add.text(200, 280, 'Resume', {
            fontSize: '36px',
            fill: '#00ff00',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);
        this.resumeButton.setDepth(201);
        this.resumeButton.setVisible(false);
        this.resumeButton.setInteractive({ useHandCursor: true });
        this.resumeButton.on('pointerdown', () => this.resumeGame());

        // Pulsing animation for resume button
        this.resumeTween = this.tweens.add({
            targets: this.resumeButton,
            scale: 1.1,
            duration: 500,
            yoyo: true,
            repeat: -1,
            paused: true
        });

        // Restart button
        this.restartButton = this.add.text(200, 360, 'Restart', {
            fontSize: '36px',
            fill: '#ffff00',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);
        this.restartButton.setDepth(201);
        this.restartButton.setVisible(false);
        this.restartButton.setInteractive({ useHandCursor: true });
        this.restartButton.on('pointerdown', () => this.restartFromPause());

        // Reset High Score button
        this.resetHighScoreButton = this.add.text(200, 410, 'Reset High Score', {
            fontSize: '24px',
            fill: '#ff6666',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5);
        this.resetHighScoreButton.setDepth(201);
        this.resetHighScoreButton.setVisible(false);
        this.resetHighScoreButton.setInteractive({ useHandCursor: true });
        this.resetHighScoreButton.on('pointerdown', () => this.resetHighScore());

        // Debug Mode toggle button
        this.debugToggleButton = this.add.text(200, 460, this.getDebugButtonText(), {
            fontSize: '24px',
            fill: '#66ccff',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5);
        this.debugToggleButton.setDepth(201);
        this.debugToggleButton.setVisible(false);
        this.debugToggleButton.setInteractive({ useHandCursor: true });
        this.debugToggleButton.on('pointerdown', () => this.toggleDebugMode());

        // ESC hint
        this.escHint = this.add.text(200, 520, 'Press ESC to Resume', {
            fontSize: '18px',
            fill: '#cccccc',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5);
        this.escHint.setDepth(201);
        this.escHint.setVisible(false);
    }

    showPauseMenu() {
        if (!this.gameStarted || this.gameOver || this.isPaused) return;

        this.isPaused = true;
        this.physics.pause();

        // Show pause menu elements
        this.pauseOverlay.setVisible(true);
        this.pauseTitle.setVisible(true);
        this.resumeButton.setVisible(true);
        this.restartButton.setVisible(true);
        this.resetHighScoreButton.setVisible(true);
        this.debugToggleButton.setVisible(true);
        this.escHint.setVisible(true);

        // Update debug button text in case it changed
        this.debugToggleButton.setText(this.getDebugButtonText());

        // Start pulsing animation
        this.resumeTween.resume();

        console.log('Game paused');
    }

    resumeGame() {
        if (!this.isPaused) return;

        this.isPaused = false;
        this.physics.resume();

        // Hide pause menu elements
        this.pauseOverlay.setVisible(false);
        this.pauseTitle.setVisible(false);
        this.resumeButton.setVisible(false);
        this.restartButton.setVisible(false);
        this.resetHighScoreButton.setVisible(false);
        this.debugToggleButton.setVisible(false);
        this.escHint.setVisible(false);

        // Stop pulsing animation
        this.resumeTween.pause();
        this.resumeButton.setScale(1);

        console.log('Game resumed');
    }

    restartFromPause() {
        this.isPaused = false;
        this.physics.resume();
        this.scene.restart();
    }

    resetHighScore() {
        if (confirm('Are you sure you want to reset your high score?')) {
            localStorage.removeItem('sarahsGameHighScore');
            console.log('High score reset');

            // Visual feedback
            this.resetHighScoreButton.setText('High Score Reset!');
            this.resetHighScoreButton.setFill('#00ff00');

            this.time.delayedCall(1500, () => {
                this.resetHighScoreButton.setText('Reset High Score');
                this.resetHighScoreButton.setFill('#ff6666');
            });
        }
    }

    toggleDebugMode() {
        this.debugMode = !this.debugMode;
        localStorage.setItem('sarahsGameDebugMode', this.debugMode.toString());

        // Update physics debug rendering
        if (this.debugMode) {
            this.physics.world.drawDebug = true;
            this.physics.world.debugGraphic = this.add.graphics();
        } else {
            this.physics.world.drawDebug = false;
            if (this.physics.world.debugGraphic) {
                this.physics.world.debugGraphic.clear();
            }
        }

        // Update button text
        this.debugToggleButton.setText(this.getDebugButtonText());

        // Visual feedback
        const originalColor = this.debugToggleButton.fillColor;
        this.debugToggleButton.setFill('#00ff00');
        this.time.delayedCall(200, () => {
            this.debugToggleButton.setFill('#66ccff');
        });

        console.log(`Debug mode ${this.debugMode ? 'enabled' : 'disabled'}`);
    }

    getDebugButtonText() {
        return this.debugMode ? 'Debug: ON ✓' : 'Debug: OFF';
    }

    getHighScore() {
        const saved = localStorage.getItem('sarahsGameHighScore');
        return saved ? parseInt(saved) : 0;
    }

    saveHighScore(score) {
        const currentHigh = this.getHighScore();
        if (score > currentHigh) {
            localStorage.setItem('sarahsGameHighScore', score.toString());
            return true; // New high score!
        }
        return false;
    }

    flap() {
        if (this.gameOver) return;

        // Start game on first flap
        if (!this.gameStarted) {
            console.log('Game starting! Initializing pipe spawning...');
            this.gameStarted = true;
            this.readyText.setVisible(false);
            this.pauseButton.setVisible(true);
            this.bird.body.setGravity(0, 650); // Reduced gravity for smoother, less dramatic falling

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
        this.bird.body.setVelocityY(-280); // Reduced flap strength to match lower gravity

        // Rotate bird
        this.tweens.add({
            targets: this.bird,
            angle: -20,
            duration: 100
        });
    }

    spawnPipe() {
        if (this.gameOver) return;

        const pipeEmoji = '🌳'; // Using tree emoji for pipes
        const emojiSize = 50;

        // Progressive difficulty system
        let pipeType, gapSize, minPipeHeight, maxPipeHeight, gapYMin, gapYMax;

        // ALWAYS make the first pipe come from bottom (easier start after tap-to-start)
        if (this.score === 0 && this.pipes.children.size === 0) {
            pipeType = 'bottom';
            minPipeHeight = 120;
            maxPipeHeight = 180; // Slightly taller first pipe
            console.log('First pipe: forcing bottom pipe for fair start');
        } else if (this.score < 3) {
            // Score 0-2: Short-medium single pipes, good-sized gaps
            pipeType = Phaser.Math.Between(0, 1) === 0 ? 'top' : 'bottom';
            gapSize = 170; // Reduced from 180
            minPipeHeight = 120; // Increased from 100
            maxPipeHeight = 220; // Increased from 200
        } else if (this.score < 5) {
            // Score 3-4: Introduce more doubles earlier, medium pipes
            const rand = Phaser.Math.Between(0, 2);
            pipeType = rand === 0 ? 'both' : (rand === 1 ? 'top' : 'bottom'); // 33% double chance (up from 25%)
            gapSize = 160; // Reduced from 170
            minPipeHeight = 140; // Increased from 120
            maxPipeHeight = 260; // Increased from 250
            gapYMin = 180;
            gapYMax = 380;
        } else if (this.score < 8) {
            // Score 5-7: More doubles, taller pipes
            const rand = Phaser.Math.Between(0, 3);
            pipeType = rand < 2 ? 'both' : (rand === 2 ? 'top' : 'bottom'); // 50% double chance (up from 40%)
            gapSize = 155; // Reduced from 160
            minPipeHeight = 160; // Increased from 150
            maxPipeHeight = 310; // Increased from 300
            gapYMin = 170;
            gapYMax = 390;
        } else if (this.score < 12) {
            // Score 8-11: Mostly doubles, tall pipes, smaller gaps
            const rand = Phaser.Math.Between(0, 5);
            pipeType = rand < 4 ? 'both' : (rand === 4 ? 'top' : 'bottom');
            gapSize = 148; // Reduced from 150
            minPipeHeight = 180;
            maxPipeHeight = 360; // Increased from 350
            gapYMin = 160;
            gapYMax = 400;
        } else {
            // Score 12+: Maximum difficulty - tallest pipes, smallest gaps
            const rand = Phaser.Math.Between(0, 6);
            pipeType = rand < 5 ? 'both' : (rand === 5 ? 'top' : 'bottom');
            gapSize = 138; // Reduced from 140
            minPipeHeight = 200;
            maxPipeHeight = 410; // Increased from 400
            gapYMin = 150;
            gapYMax = 410;
        }

        // For double pipes, vary the gap position (not always centered)
        const gapY = pipeType === 'both' ? Phaser.Math.Between(gapYMin, gapYMax) : Phaser.Math.Between(150, 400);

        console.log(`Spawning ${pipeType} pipe(s), score: ${this.score}, gap: ${gapSize || 'N/A'}, heights: ${minPipeHeight}-${maxPipeHeight}`);

        // Create top pipe if needed
        if (pipeType === 'top' || pipeType === 'both') {
            const topPipeHeight = pipeType === 'both'
                ? (gapY - gapSize/2)
                : Phaser.Math.Between(minPipeHeight, maxPipeHeight);
            const topEmojiCount = Math.ceil(topPipeHeight / emojiSize);

            for (let i = 0; i < topEmojiCount; i++) {
                const pipeSegment = this.add.text(450, i * emojiSize + 25, pipeEmoji, {
                    fontSize: `${emojiSize}px`
                }).setOrigin(0.5);
                pipeSegment.setDepth(10);
                this.physics.add.existing(pipeSegment);
                pipeSegment.body.setAllowGravity(false);
                pipeSegment.body.setImmovable(true);
                pipeSegment.body.setSize(35, 35); // Tighter hitbox - about 70% of emoji size
                pipeSegment.body.setOffset(7.5, 7.5); // Center the smaller hitbox

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
            let bottomPipeStart;
            if (pipeType === 'both') {
                // For double pipes, calculate from gap position
                bottomPipeStart = gapY + gapSize/2;
            } else {
                // For single bottom pipes, vary the starting position based on difficulty
                const pipeHeight = Phaser.Math.Between(minPipeHeight, maxPipeHeight);
                bottomPipeStart = 560 - pipeHeight; // Start position to achieve desired height
            }
            const bottomEmojiCount = Math.ceil((560 - bottomPipeStart) / emojiSize);

            for (let i = 0; i < bottomEmojiCount; i++) {
                const pipeSegment = this.add.text(450, bottomPipeStart + i * emojiSize + 25, pipeEmoji, {
                    fontSize: `${emojiSize}px`
                }).setOrigin(0.5);
                pipeSegment.setDepth(10);
                this.physics.add.existing(pipeSegment);
                pipeSegment.body.setAllowGravity(false);
                pipeSegment.body.setImmovable(true);
                pipeSegment.body.setSize(35, 35); // Tighter hitbox - about 70% of emoji size
                pipeSegment.body.setOffset(7.5, 7.5); // Center the smaller hitbox

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
        if (this.gameOver || this.isPaused) return;

        // Always scroll clouds for background effect (unless paused)
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

        // Hide pause button
        this.pauseButton.setVisible(false);

        // Stop pipe timer
        if (this.pipeTimer) {
            this.pipeTimer.destroy();
        }

        // Stop all pipes
        this.pipes.children.entries.forEach(pipe => {
            pipe.body.setVelocity(0, 0);
        });

        // Save high score
        const isNewHighScore = this.saveHighScore(this.score);

        // Transition to game over scene
        this.time.delayedCall(500, () => {
            this.scene.start('GameOverScene', {
                score: this.score,
                isNewHighScore: isNewHighScore,
                highScore: this.getHighScore()
            });
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
        this.isNewHighScore = data.isNewHighScore || false;
        this.highScore = data.highScore || 0;
    }

    create() {
        // Sky background
        const skyGradient = this.add.graphics();
        skyGradient.fillGradientStyle(0x87ceeb, 0x87ceeb, 0xe0f6ff, 0xe0f6ff, 1);
        skyGradient.fillRect(0, 0, 400, 600);

        // Game Over text
        this.add.text(200, 120, 'Game Over!', {
            fontSize: '48px',
            fill: '#ff0000',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 6
        }).setOrigin(0.5);

        // Emoji based on performance
        const emoji = this.isNewHighScore ? '🎉' : '😢';
        this.add.text(200, 200, emoji, {
            fontSize: '64px'
        }).setOrigin(0.5);

        // New High Score message
        if (this.isNewHighScore) {
            const newHighText = this.add.text(200, 270, 'NEW HIGH SCORE!', {
                fontSize: '28px',
                fill: '#00ff00',
                fontStyle: 'bold',
                stroke: '#000000',
                strokeThickness: 4
            }).setOrigin(0.5);

            // Pulsing animation for new high score
            this.tweens.add({
                targets: newHighText,
                scale: 1.1,
                duration: 500,
                yoyo: true,
                repeat: -1
            });
        }

        // Score display
        this.add.text(200, 320, 'Score', {
            fontSize: '28px',
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);

        this.add.text(200, 365, this.finalScore.toString(), {
            fontSize: '56px',
            fill: '#ffff00',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 6
        }).setOrigin(0.5);

        // High Score display
        if (!this.isNewHighScore && this.highScore > 0) {
            this.add.text(200, 420, `High Score: ${this.highScore}`, {
                fontSize: '24px',
                fill: '#aaaaaa',
                stroke: '#000000',
                strokeThickness: 3
            }).setOrigin(0.5);
        }

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
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: 400,
        height: 600
    },
    render: {
        antialias: false,
        pixelArt: false,
        roundPixels: true
    },
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
