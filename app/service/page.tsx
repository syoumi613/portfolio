
export default function ServicePage() {
    return (
        <div className="pt-32 px-6 max-w-4xl mx-auto pb-20 min-h-screen">
            <h1 className="text-3xl font-bold mb-8 text-center">Service</h1>
            <p className="mb-20 text-center text-gray-600">
                撮影プランや料金についてのご案内です。
            </p>

            <section id="flow" className="pt-20 border-t border-gray-200">
                <h2 className="text-2xl font-bold mb-8 text-center">ご依頼の流れ</h2>
                <div className="space-y-8 max-w-2xl mx-auto">
                    <div className="flex gap-4">
                        <div className="flex-none w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center font-bold">1</div>
                        <div>
                            <h3 className="font-bold mb-2">お問い合わせ</h3>
                            <p className="text-gray-600">フォームまたはSNSからご連絡ください。</p>
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <div className="flex-none w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center font-bold">2</div>
                        <div>
                            <h3 className="font-bold mb-2">ヒアリング・お見積り</h3>
                            <p className="text-gray-600">撮影内容の詳細をお伺いし、お見積りを提示します。</p>
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <div className="flex-none w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center font-bold">3</div>
                        <div>
                            <h3 className="font-bold mb-2">撮影当日</h3>
                            <p className="text-gray-600">現地にて撮影を行います。</p>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    )
}
