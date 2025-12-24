
interface EditableListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  onAdd: () => void;
  onRemove: (index: number) => void;
  onEdit?: (index: number, item: T) => void;
  addLabel?: string;
  emptyMessage?: string;
  label?: string;
}

export function EditableList<T>({
  items,
  renderItem,
  onAdd,
  onRemove,
  onEdit,
  addLabel = 'Add Item',
  emptyMessage = 'No items yet',
  label = 'Items',
}: EditableListProps<T>) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">{label} ({items.length})</h3>
        {addLabel && onAdd && (
          <button onClick={onAdd} className="btn-primary">
            {addLabel}
          </button>
        )}
      </div>
      
      {items.length === 0 ? (
        <div className="text-center text-gray-400 py-8">{emptyMessage}</div>
      ) : (
        <div className="space-y-2">
          {items.map((item, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex-1">{renderItem(item, index)}</div>
              <div className="flex gap-2">
                {onEdit && (
                  <button
                    onClick={() => onEdit(index, item)}
                    className="text-sport-green hover:text-green-600"
                  >
                    Edit
                  </button>
                )}
                <button
                  onClick={() => onRemove(index)}
                  className="text-red-500 hover:text-red-600"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

