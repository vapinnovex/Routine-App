import type { ReactNode } from "react";
import { FlatList, Platform, View } from "react-native";
import NativeList, { ScaleDecorator as NativeDecorator, type DraggableFlatListProps } from "react-native-draggable-flatlist";
import { Button } from "@/components/ui/Button";

export type { RenderItemParams } from "react-native-draggable-flatlist";

export function ScaleDecorator({ children }: { children: ReactNode }) {
  return Platform.OS === "web" ? <>{children}</> : <NativeDecorator>{children}</NativeDecorator>;
}

/** Native drag gestures plus keyboard-accessible ordering on the web. */
export default function ReorderableList<T>({ reordering = false, ...props }: DraggableFlatListProps<T> & { reordering?: boolean }) {
  if (Platform.OS !== "web") return <NativeList {...props} />;
  const { data, renderItem, onDragEnd, containerStyle, ...rest } = props;
  const move = (from: number, direction: number) => {
    const to = from + direction;
    if (to < 0 || to >= data.length) return;
    const next = [...data];
    [next[from], next[to]] = [next[to], next[from]];
    onDragEnd?.({ data: next, from, to });
  };
  return <View style={containerStyle}>
    <FlatList {...rest} data={data} renderItem={({ item, index }) => <View>
      {renderItem({ item, getIndex: () => index, drag: () => undefined, isActive: false })}
      {reordering && <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
        <Button label={`Move item ${index + 1} up`} variant="ghost" disabled={index === 0} onPress={() => move(index, -1)} style={{ flex: 1 }} />
        <Button label={`Move item ${index + 1} down`} variant="ghost" disabled={index === data.length - 1} onPress={() => move(index, 1)} style={{ flex: 1 }} />
      </View>}
    </View>} />
  </View>;
}
