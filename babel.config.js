module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      function replaceImportMetaEnv() {
        return {
          visitor: {
            MemberExpression(path) {
              const object = path.node.object;
              const property = path.node.property;
              if (
                object.type === 'MetaProperty' &&
                object.meta.name === 'import' &&
                object.property.name === 'meta' &&
                property.type === 'Identifier' &&
                property.name === 'env'
              ) {
                path.replaceWith({
                  type: 'UnaryExpression',
                  operator: 'void',
                  prefix: true,
                  argument: { type: 'NumericLiteral', value: 0 },
                });
              }
            },
          },
        };
      },
    ],
  };
};
