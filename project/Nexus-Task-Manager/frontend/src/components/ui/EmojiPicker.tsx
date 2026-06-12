const EMOJIS = ['💼','🏡','🎓','🏥','💰','📚','🎨','⚽','🎵','✈️','🍕','🛒','💻','📱','🔬','🏋️','🌿','📝','🎯','🔑','⚡','🌟','🎁','🔧'];

interface EmojiPickerProps {
  value: string;
  onChange: (emoji: string) => void;
}

export function EmojiPicker({ value, onChange }: EmojiPickerProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {EMOJIS.map(e => (
        <button
          key={e}
          type="button"
          className={`emoji-pick ${value === e ? 'ring-2 ring-purple-400' : ''}`}
          onClick={() => onChange(e)}
        >
          {e}
        </button>
      ))}
    </div>
  );
}
