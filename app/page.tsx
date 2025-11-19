import Image from 'next/image';

export default function Home() {
  return (
    <div className="flex flex-col items-center h-screen">
      <header className="w-full bg-gray-900 text-white py-6 shadow-md">
        <h1 className="text-center text-3xl font-semibold tracking-wide">
          投資シミュレータ
        </h1>
      </header>
    </div>
  );
}
