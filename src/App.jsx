import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { BlockMath } from "react-katex";
import "katex/dist/katex.min.css";

export default function App() {
	const [sessionId, setSessionId] = useState("");
	const [step, setStep] = useState("ask_n");
	const [input, setInput] = useState("");
	const [multiInput, setMultiInput] = useState([]);
	const [boolInput, setBoolInput] = useState(null);
	const [hasSelectedBool, setHasSelectedBool] = useState(false);
	const [inputs, setInputs] = useState({});
	const [results, setResults] = useState(null);
	const [error, setError] = useState(null);
	const [history, setHistory] = useState([]);
	const [metricLabels, setMetricLabels] = useState([]);
	const scrollRef = useRef(null);

	useEffect(() => {
		const newId = `sess-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
		setSessionId(newId);
	}, []);

	useEffect(() => {
		if (isBoolStep(step)) {
			setBoolInput(null);
			setHasSelectedBool(false);
		}
		if (step === "ask_coords" && inputs.n) {
			setMultiInput(new Array(inputs.n).fill(""));
		}
	}, [step]);

	useEffect(() => {
		scrollRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [step, results]);

	const handleSubmit = async () => {
		const valueToSend = isBoolStep(step)
			? boolInput
			: step === "ask_coords" || step === "ask_alt_basis_vectors" || step === "ask_metric"
			? multiInput
			: parseInput(input);

		const answer = isBoolStep(step)
			? Object.entries(toggleValues[step] || {}).find(([label, val]) => val === boolInput)?.[0] || ""
			: step === "ask_coords" || step === "ask_alt_basis_vectors" || step === "ask_metric"
			? multiInput.join(", ")
			: input;

		const newHistoryItem = {
			step,
			question: renderPrompt(step, inputs),
			answer,
		};

		try {
			const response = await axios.post("https://tensor-calc-backend.onrender.com/next", {
				session_id: sessionId,
				input: valueToSend,
			});

			if (response.data.step === "done") {
				setResults(response.data.results);
			} else {
				setInputs(response.data.inputs);
				setStep(response.data.step);
				setInput("");
				setMultiInput([]);
				setMetricLabels(response.data.metric_labels || []);
				setHistory((prev) => [...prev, newHistoryItem]);
			}
			setError(null);
		} catch (err) {
			setError(err.response?.data?.error || "Unknown error");
		}
	};

	const parseInput = (raw) => {
		if (["ask_metric", "ask_alt_basis_vectors"].includes(step)) {
			return raw.split(/\s*,\s*/);
		}
		const num = Number(raw);
		return isNaN(num) ? raw : num;
	};

	const isBoolStep = (step) =>
		["ask_alt_basis", "ask_diag", "ask_orthonormal", "ask_basis_metric_type", "ask_manifold_type"].includes(step);

	const renderPrompt = (s, data = inputs) => {
		switch (s) {
			case "ask_n":
				return "Enter number of dimensions of the manifold:";
			case "ask_coords":
				return `Enter ${data.n} coordinate labels:`;
			case "ask_alt_basis":
				return "Would you like to include an alternate basis?";
			case "ask_alt_basis_vectors":
				return `Enter ${data.n ** 2} alternate basis components:`;
			case "ask_orthonormal":
				return "Is the alternate basis orthonormal?";
			case "ask_manifold_type":
				return "Is the manifold pseudo-Riemannian?";
			case "ask_basis_metric_type":
				return "Will the metric components be those of the coordinate basis or the alternate basis?";
			case "ask_diag":
				return "Is the metric diagonal?";
			case "ask_metric": {
				const count = data.metric_diag ? data.n : (data.n * (data.n + 1)) / 2;
				return `Enter ${count} metric components:`;
			}
			default:
				return "";
		}
	};

	const toggleValues = {
		ask_alt_basis: {
			"No alternate basis": false,
			"Include alternate basis": true,
		},
		ask_diag: {
			"Metric is diagonal": true,
			"Metric is not diagonal": false,
		},
		ask_orthonormal: {
			"Orthonormal": true,
			"Not orthonormal": false,
		},
		ask_basis_metric_type: {
			"Coordinate basis": true,
			"Alternate basis": false,
		},
		ask_manifold_type: {
			"Riemannian": false,
			"Pseudo-Riemannian": true,
		},
	};

	const isSubmitDisabled =
		(isBoolStep(step) && !hasSelectedBool) ||
		(step === "ask_coords" && multiInput.some((item) => item.trim() === "")) ||
		(step === "ask_alt_basis_vectors" && (multiInput.length !== inputs.n ** 2 || multiInput.some((item) => item.trim() === ""))) ||
		(step === "ask_metric" && (multiInput.length !== metricLabels.length || multiInput.some((item) => item.trim() === "")));

	return (
		<div className="p-6 max-w-xl mx-auto">
			<h1 className="text-xl font-bold mb-4">Tensor Calculator</h1>

			{history.map((item, idx) => (
				<div key={idx} className="mb-2 text-gray-500">
					<p className="font-medium">{item.question}</p>
					<p className="ml-4">{item.answer}</p>
				</div>
			))}

			{!results && (
				<div ref={scrollRef}>
					<p className="mb-2 font-medium">{renderPrompt(step)}</p>

					<form
						onSubmit={(e) => {
							e.preventDefault();
							handleSubmit();
						}}
					>

						{isBoolStep(step) ? (
							<div className="mb-4 flex flex-col gap-2">
								{Object.entries(toggleValues[step] || {}).map(([label, value]) => (
									<label key={label} className="flex items-center gap-2">
										<input
											type="radio"
											name="boolInput"
											checked={boolInput === value}
											onChange={() => {
												setBoolInput(value);
												setHasSelectedBool(true);
											}}
											onKeyDown={(e) => e.key === "Enter" && !isSubmitDisabled && handleSubmit()}
										/>
										{label}
									</label>
								))}
							</div>
						) : step === "ask_coords" ? (
							<div className="mb-4 flex flex-col gap-2">
								{multiInput.map((val, idx) => (
									<input
										key={idx}
										type="text"
										value={val}
										onChange={(e) => {
											const updated = [...multiInput];
											updated[idx] = e.target.value;
											setMultiInput(updated);
										}}
										onKeyDown={(e) => e.key === "Enter" && !isSubmitDisabled && idx === multiInput.length - 1 && handleSubmit()}
										className="border rounded p-2"
									/>
								))}
							</div>
						) : step === "ask_alt_basis_vectors" ? (
							<div className="mb-4 space-y-2">
								{[...Array(inputs.n)].map((_, colIdx) => (
									<div key={colIdx} className="flex items-start gap-2 mb-6">
										<BlockMath>{`\\mathbf{e}_{${colIdx}} =`}</BlockMath>
										<BlockMath>{`\\left(\\vphantom{\\begin{matrix}1\\\\1\\\\1\\end{matrix}}\\right.`}</BlockMath>
										<div className="flex flex-col items-start">
											{[...Array(inputs.n)].map((_, rowIdx) => {
												const index = rowIdx + colIdx * inputs.n;
												return (
													<input
														key={index}
														type="text"
														value={multiInput[index] || ""}
														onChange={(e) => {
															const updated = [...multiInput];
															updated[index] = e.target.value;
															setMultiInput(updated);
														}}
														onKeyDown={(e) =>
															e.key === "Enter" &&
															!isSubmitDisabled &&
															colIdx === inputs.n - 1 &&
															rowIdx === inputs.n - 1 &&
															handleSubmit()
														}
														className="border rounded p-1 w-24 mb-1"
													/>
												);
											})}
										</div>
										<BlockMath>{`\\left.\\vphantom{\\begin{matrix}1\\\\1\\\\1\\end{matrix}}\\right)`}</BlockMath>
									</div>
								))}
						</div>
						) : step === "ask_metric" ? (
							<div className="mb-4 flex flex-col gap-2">
								{metricLabels.map((label, idx) => (
									<div key={idx} className="flex items-center gap-2">
										<BlockMath math={`${label} =`} />
										<input
											type="text"
											value={multiInput[idx] || ""}
											onChange={(e) => {
												const updated = [...multiInput];
												updated[idx] = e.target.value;
												setMultiInput(updated);
											}}
											onKeyDown={(e) =>
												e.key === "Enter" &&
												!isSubmitDisabled &&
												idx === metricLabels.length - 1 &&
												handleSubmit()
											}
											className="border rounded p-2 w-32"
										/>
									</div>
								))}
							</div>
						) : (
							<input
								type="text"
								value={input}
								onChange={(e) => setInput(e.target.value)}
								onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
								className="border rounded p-2 w-full mb-4"
							/>
						)}

						<button
							type="submit"
							disabled={isSubmitDisabled}
							className={`px-4 py-2 rounded font-medium ${
								isSubmitDisabled
									? "bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-700 dark:text-gray-400"
									: "bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
							}`}
						>
							Submit
						</button>
					</form>

					{error && <p className="text-red-600 mt-4">{error}</p>}
				</div>
			)}

			{results && (
				<div ref={scrollRef} className="mt-6">
					<h2 className="text-xl font-bold mb-4">Tensor Output</h2>
					{[
						"Metric",
						"Inverse metric",
						"∂ Metric",
						"Christoffel symbols",
						"∂ Christoffel symbols",
						"Riemann curvature tensor",
						"Ricci curvature tensor",
						"Ricci scalar",
						"Einstein tensor",
						"Mixed-index Einstein tensor",
						"Contravariant Einstein tensor",
					].map((title) => {
						const lines = results[title];
						const safeLines = Array.isArray(lines)
							? lines.filter((line) => typeof line === "string" && line.trim() !== "")
							: [];

						return safeLines.length > 0 ? (
							<details key={title} className="mb-4">
								<summary className="cursor-pointer font-semibold text-blue-900 dark:text-blue-300">{title}</summary>
								<div className="pl-4 mt-2">
									{safeLines.map((line, idx) => (
										<BlockMath key={idx}>{line}</BlockMath>
									))}
								</div>
							</details>
						) : (
							<p key={title} className="mb-4 text-slate-500 italic dark:text-gray-400">
								{title} – all components equal zero
							</p>
						);
					})}
				</div>
			)}
		</div>
	);
}