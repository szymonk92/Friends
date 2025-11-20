import React from 'react';
import { View, StyleSheet, ViewProps } from 'react-native';

const CenteredContainer: React.FC<ViewProps> = ({ children, style, ...props }) => {
  return (
    <View style={[styles.container, style]} {...props}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default CenteredContainer;
