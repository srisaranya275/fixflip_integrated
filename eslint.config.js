import firebaseRulesPlugin from '@firebase/eslint-plugin-security-rules';

export default [
  {
    ignores: ['dist/**/*', 'node_modules/**/*', 'RepairLoopCore/**/*'],
  },
  firebaseRulesPlugin.configs['flat/recommended'],
];
