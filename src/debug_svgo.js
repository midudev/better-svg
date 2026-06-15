
const { optimize } = require('svgo');

const svgContent = '<svg v-bind="attributes" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78"/></svg>';

const removeClasses = false;

const plugins = [
    {
      name: 'preset-default',
      params: {
        overrides: {
          cleanupIds: false,
          removeUnknownsAndDefaults: removeClasses
        }
      }
    },
    'removeDoctype',
    'removeComments',
    {
      name: 'removeAttrs',
      params: {
        attrs: [
          'xmlns:xlink',
          'xml:space',
          ...(removeClasses ? ['class'] : [])
        ]
      }
    }
];

const result = optimize(svgContent, {
    multipass: true,
    plugins
});

console.log('Original:', svgContent);
console.log('Optimized:', result.data);

if (!result.data.includes('v-bind')) {
    console.error('FAIL: v-bind was removed');
} else {
    console.log('SUCCESS: v-bind was preserved');
}
