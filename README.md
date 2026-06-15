# Better SVG

<div align="center">

![image](./static/screenshot.png)

</div>

<div align="center">
   The ultimate Visual Studio Code extension for SVG development. Real-time preview, integrated SVGO optimization, and seamless framework support.
</div>

</p>

<div align="center">
    <a href="https://marketplace.visualstudio.com/items?itemName=midudev.better-svg" target="_blank" rel="noopener">
        VS Marketplace
    </a>
    <span>&nbsp;❖&nbsp;</span>
    <a href="#features">
        Features
    </a>
    <span>&nbsp;❖&nbsp;</span>
    <a href="#supported-files">
        Supported Files
    </a>
    <span>&nbsp;❖&nbsp;</span>
    <a href="#optimization">
        Optimization
    </a>
    <span>&nbsp;❖&nbsp;</span>
    <a href="#configuration">
        Configuration
    </a>
</div>

<p></p>

<div align="center">

[![made-for-VSCode](https://img.shields.io/badge/Made%20for-VSCode-1f425f.svg)](https://code.visualstudio.com/)
![SVG Badge](https://img.shields.io/badge/SVG-FFB13B?logo=svg&logoColor=fff&style=flat)
![SVGO Badge](https://img.shields.io/badge/SVGO-3E7FC1?logo=svgo&logoColor=fff&style=flat)
![GitHub stars](https://img.shields.io/github/stars/midudev/better-svg)

</div>

## Features

- ✨ **Interactive Preview Editor**: Open any `.svg` file to get a powerful editor with a live preview side-by-side.
- 🖼️ **Explorer Preview**: A dedicated "SVG Preview" panel in the Explorer view that tracks your active SVG file automatically.
- 🎨 **Smart Hover Preview**: Hover over any SVG code in your source files to see an instant preview and optimization options.
- 📑 **Gutter Icons**: Small SVG icons appear next to the line numbers where SVGs are defined in your code.
- 🔍 **Advanced Viewport Controls**: Zoom with click/Alt+click, scroll with Alt, and drag to pan through your graphics.
- 🌓 **Contextual Visualization**: Toggle dark backgrounds and grid overlays to see how your SVGs look in different environments.
- 🌈 **currentColor Control**: Dynamically change the `currentColor` value to test your icons with different theme colors.

## Supported Files

Better SVG isn't just for `.svg` files. It understands SVG syntax inside a wide range of modern web frameworks:

- **Static**: `.svg`, `.xml`, `.html`
- **React**: `.jsx`, `.tsx`
- **Vue**: `.vue`
- **Astro**: `.astro`
- **Svelte**: `.svelte`
- **PHP**: `.php`
- **Laravel Blade**: `.blade.php`
- **Liquid (Shopify)**: `.liquid`
- **Django**: `django-html` templates
- **EJS**: `.ejs`
- **ERB (Ruby)**: `.erb`

The extension automatically detects SVG tags within these files, providing gutter icons, hover previews, and framework-aware optimization.

## Optimization

Integrated **SVGO** power allows you to shrink your SVGs without leaving the editor.

### Ways to optimize:
1. **Toolbar Button**: Use the ⚡ icon in the SVG editor title bar.
2. **Context Menu**: Right-click an SVG file in the Explorer and select **Optimize SVG**.
3. **From Hover**: Hover over an inline SVG in your code and click the **⚡ Optimize SVG** action link.

### Smart Framework Support
When optimizing inline SVGs (like in React or Vue), Better SVG:
- Preserves framework-specific attributes (e.g., `v-if`, `on:click`, `className`).
- Handles JSX interpolation and spread operators (`{...props}`).
- Maintains the coding style of the host file.

## Configuration

Customize your workflow through **Settings → Extensions → Better SVG**:

### Preview & UI

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `betterSvg.autoReveal` | `boolean` | `true` | Automatically reveal and expand the SVG Preview panel in Explorer when opening SVG files. |
| `betterSvg.autoCollapse` | `boolean` | `true` | Automatically collapse the SVG Preview panel when no SVG files are active. |
| `betterSvg.enableHover` | `boolean` | `true` | Enable the hover preview when mouse is over SVG code. |
| `betterSvg.showGutterPreview` | `boolean` | `true` | Show small preview icons next to line numbers in the gutter. |
| `betterSvg.defaultColor` | `string` | `"#ffffff"` | The hex color used to replace `currentColor` in previews. |

### Optimization (SVGO)

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `betterSvg.removeClasses` | `boolean` | `true` | Remove `class` attributes during optimization. Only applies to standalone `.svg` files; inline framework SVGs always keep their classes. |
| `betterSvg.removeComments` | `boolean` | `true` | Remove comments from the SVG during optimization. |
| `betterSvg.removeDoctype` | `boolean` | `true` | Remove the `<!DOCTYPE>` declaration during optimization. |
| `betterSvg.cleanupIds` | `boolean` | `false` | Minify and remove unused IDs. Disabled by default because it can break sprites, references and animations. |
| `betterSvg.floatPrecision` | `number` | `3` | Number of decimal places to keep for numeric values (lower means smaller files but less precision). |
| `betterSvg.multipass` | `boolean` | `true` | Run SVGO multiple times until the output stops shrinking for better compression. |

## License

[Apache-2.0 license](https://github.com/midudev/better-svg/blob/main/LICENSE)
