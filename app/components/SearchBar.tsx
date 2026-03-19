type SearchBarProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
};

export function SearchBar({
  value,
  onChange,
  onSubmit,
  isLoading,
}: SearchBarProps) {
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-10 flex w-full max-w-3xl flex-col gap-3 rounded-[1.6rem] border border-slate-200/90 bg-white/95 p-3 shadow-[0_18px_45px_rgba(15,23,42,0.08)] sm:flex-row sm:items-center"
    >
      <label htmlFor="market-query" className="sr-only">
        Search topic
      </label>
      <input
        id="market-query"
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search a market, idea, niche, or customer pain point"
        className="h-14 flex-1 rounded-[1rem] border border-transparent bg-slate-50 px-5 text-base text-slate-900 outline-none transition duration-200 focus:border-cyan-300 focus:bg-white focus:shadow-[0_0_0_4px_rgba(14,165,233,0.10)]"
      />
      <button
        type="submit"
        disabled={isLoading || value.trim().length === 0}
        className="h-14 rounded-[1rem] bg-slate-950 px-6 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(15,23,42,0.18)] transition duration-200 hover:bg-slate-800 hover:shadow-[0_18px_34px_rgba(15,23,42,0.22)] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
      >
        {isLoading ? "Analyzing..." : "Analyze"}
      </button>
    </form>
  );
}
