import React from "react";

export default function ToggleSwitch({ value, onChange, leftLabel, rightLabel }) {
	return (
		<div className="flex items-center gap-4 mb-4">
			<span>{leftLabel}</span>
			<label className="relative inline-flex items-center cursor-pointer">
				<input
					type="checkbox"
					checked={value}
					onChange={(e) => onChange(e.target.checked)}
					className="sr-only peer"
				/>
				<div className="w-12 h-6 bg-gray-300 rounded-full peer-checked:bg-blue-600 relative transition-colors">
					<span className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transform transition-transform peer-checked:translate-x-6" />
				</div>
			</label>
			<span>{rightLabel}</span>
		</div>
	);
}