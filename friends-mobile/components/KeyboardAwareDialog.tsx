import { useEffect, useState, type ComponentProps } from 'react';
import { Keyboard, Platform, type KeyboardEvent } from 'react-native';
import { Dialog as PaperDialog } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Paper's Dialog is centred in a full-screen modal and never moves for the
// keyboard. Android resizes the window for the keyboard, so the dialog
// re-centres on its own; iOS doesn't, so the keyboard covers the dialog's
// lower half — including its Save/Cancel buttons. Lifting the dialog by the
// keyboard height keeps it centred in the space above the keyboard.
function useIosKeyboardHeight(): number {
  const [height, setHeight] = useState(() =>
    Platform.OS === 'ios' && Keyboard.isVisible() ? (Keyboard.metrics()?.height ?? 0) : 0
  );

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    const onShow = (e: KeyboardEvent) => {
      Keyboard.scheduleLayoutAnimation(e);
      setHeight(e.endCoordinates.height);
    };
    const onHide = (e: KeyboardEvent) => {
      Keyboard.scheduleLayoutAnimation(e);
      setHeight(0);
    };
    const show = Keyboard.addListener('keyboardWillShow', onShow);
    const hide = Keyboard.addListener('keyboardWillHide', onHide);
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return height;
}

function KeyboardAwareDialog({ style, ...props }: ComponentProps<typeof PaperDialog>) {
  const keyboardHeight = useIosKeyboardHeight();
  const { bottom } = useSafeAreaInsets();
  // The modal already keeps clear of the home indicator, which the keyboard covers too.
  const lift = Math.max(0, keyboardHeight - bottom);
  return <PaperDialog {...props} style={[style, lift > 0 && { marginBottom: lift }]} />;
}

/** Drop-in replacement for react-native-paper's Dialog that stays above the iOS keyboard. */
export const Dialog = Object.assign(KeyboardAwareDialog, {
  Title: PaperDialog.Title,
  Content: PaperDialog.Content,
  Actions: PaperDialog.Actions,
  ScrollArea: PaperDialog.ScrollArea,
  Icon: PaperDialog.Icon,
});
