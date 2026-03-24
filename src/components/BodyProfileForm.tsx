import { BodyProfile } from '../types';

interface BodyProfileFormProps {
  profile: BodyProfile;
  onChange: (profile: BodyProfile) => void;
}

export function BodyProfileForm({ profile, onChange }: BodyProfileFormProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    onChange({ ...profile, [name]: value });
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Gender</label>
        <select
          name="gender"
          value={profile.gender}
          onChange={handleChange}
          className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:ring-2 focus:ring-zinc-900 outline-none"
        >
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="other">Other</option>
        </select>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Preferred Size</label>
        <select
          name="preferredSize"
          value={profile.preferredSize}
          onChange={handleChange}
          className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:ring-2 focus:ring-zinc-900 outline-none"
        >
          <option value="XS">XS</option>
          <option value="S">S</option>
          <option value="M">M</option>
          <option value="L">L</option>
          <option value="XL">XL</option>
          <option value="XXL">XXL</option>
        </select>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Height</label>
        <input
          type="text"
          name="height"
          placeholder="e.g. 5ft 10in or 178cm"
          value={profile.height}
          onChange={handleChange}
          className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:ring-2 focus:ring-zinc-900 outline-none"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Weight</label>
        <input
          type="text"
          name="weight"
          placeholder="e.g. 70kg or 154lbs"
          value={profile.weight}
          onChange={handleChange}
          className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:ring-2 focus:ring-zinc-900 outline-none"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Body Type</label>
        <select
          name="bodyType"
          value={profile.bodyType}
          onChange={handleChange}
          className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:ring-2 focus:ring-zinc-900 outline-none"
        >
          <option value="Slim">Slim</option>
          <option value="Athletic">Athletic</option>
          <option value="Average">Average</option>
          <option value="Curvy">Curvy</option>
          <option value="Plus Size">Plus Size</option>
          <option value="Muscular">Muscular</option>
        </select>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Skin Tone</label>
        <select
          name="skinTone"
          value={profile.skinTone}
          onChange={handleChange}
          className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:ring-2 focus:ring-zinc-900 outline-none"
        >
          <option value="Fair">Fair</option>
          <option value="Light">Light</option>
          <option value="Medium">Medium</option>
          <option value="Tan">Tan</option>
          <option value="Deep">Deep</option>
        </select>
      </div>
    </div>
  );
}
