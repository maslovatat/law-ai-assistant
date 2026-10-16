export interface TabItem<T extends string> {
  id: T;
  label: string;
  badge?: string;
}

interface TabsProps<T extends string> {
  items: TabItem<T>[];
  active: T;
  onChange: (id: T) => void;
}

export function Tabs<T extends string>({ items, active, onChange }: TabsProps<T>) {
  return (
    <div className="tabs" role="tablist">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          role="tab"
          aria-selected={item.id === active}
          className={`tabs__item ${item.id === active ? "tabs__item--active" : ""}`}
          onClick={() => onChange(item.id)}
        >
          {item.label}
          {item.badge ? ` (${item.badge})` : ""}
        </button>
      ))}
    </div>
  );
}