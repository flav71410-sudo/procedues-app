type StatCardProps = {
  title: string;
  value: number | string;
  icon?: string;
  color?: string;
};

export default function StatCard({
  title,
  value,
  icon,
  color = "#0078B8",
}: StatCardProps) {
  return (
    <div className="bg-white rounded-2xl shadow p-6 border border-gray-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>

          <h2
            className="text-4xl font-bold mt-2"
            style={{ color }}
          >
            {value}
          </h2>
        </div>

        <div className="text-4xl">
          {icon}
        </div>
      </div>
    </div>
  );
}