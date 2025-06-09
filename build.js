const { minify } = require('terser');
const CleanCSS = require('clean-css');
const fs = require('fs');
const path = require('path');

// Configuration
const config = {
    js: {
        files: ['content.js', 'background.js', 'popup.js'],
        options: {
            compress: {
                drop_console: false, // Keep console logs for debugging
                drop_debugger: true
            },
            mangle: true,
            format: {
                comments: false
            }
        }
    },
    css: {
        files: ['styles.css'],
        options: {
            level: 2,
            format: 'beautify'
        }
    }
};

// Create dist directory if it doesn't exist
if (!fs.existsSync('dist')) {
    fs.mkdirSync('dist');
}

// Minify JavaScript files
async function minifyJS() {
    for (const file of config.js.files) {
        try {
            const code = fs.readFileSync(file, 'utf8');
            const result = await minify(code, config.js.options);
            const outputPath = path.join('dist', file);
            fs.writeFileSync(outputPath, result.code);
            console.log(`✓ Minified ${file}`);
        } catch (error) {
            console.error(`Error minifying ${file}:`, error);
        }
    }
}

// Minify CSS files
function minifyCSS() {
    const cleanCSS = new CleanCSS(config.css.options);
    for (const file of config.css.files) {
        try {
            const code = fs.readFileSync(file, 'utf8');
            const result = cleanCSS.minify(code);
            const outputPath = path.join('dist', file);
            fs.writeFileSync(outputPath, result.styles);
            console.log(`✓ Minified ${file}`);
        } catch (error) {
            console.error(`Error minifying ${file}:`, error);
        }
    }
}

// Copy other necessary files to dist
function copyFiles() {
    const filesToCopy = [
        'manifest.json',
        'popup.html',
        'privacy.html'
    ];
    
    for (const file of filesToCopy) {
        try {
            fs.copyFileSync(file, path.join('dist', file));
            console.log(`✓ Copied ${file}`);
        } catch (error) {
            console.error(`Error copying ${file}:`, error);
        }
    }
}

// Copy icons directory
function copyIcons() {
    if (fs.existsSync('icons')) {
        if (!fs.existsSync('dist/icons')) {
            fs.mkdirSync('dist/icons');
        }
        const files = fs.readdirSync('icons');
        for (const file of files) {
            try {
                fs.copyFileSync(
                    path.join('icons', file),
                    path.join('dist/icons', file)
                );
                console.log(`✓ Copied icons/${file}`);
            } catch (error) {
                console.error(`Error copying icons/${file}:`, error);
            }
        }
    }
}

// Main build function
async function build() {
    console.log('Starting build process...');
    
    // Clean dist directory if it exists
    if (fs.existsSync('dist')) {
        fs.rmSync('dist', { recursive: true });
    }
    fs.mkdirSync('dist');
    
    await minifyJS();
    minifyCSS();
    copyFiles();
    copyIcons();
    
    console.log('\nBuild completed successfully!');
}

build().catch(console.error); 