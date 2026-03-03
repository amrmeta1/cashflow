"use client";

import { motion } from "framer-motion";

export function ConnectSection() {
  return (
    <section className="py-20 md:py-32 px-4 bg-zinc-100">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <p className="text-sm font-semibold text-zinc-600 mb-4">Connect your liquidity to your most strategic advantages.</p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left Content */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-block px-4 py-2 bg-zinc-300 rounded-full text-sm font-semibold text-zinc-700 mb-6">
              CONNECT
            </div>
            
            <h2 className="text-4xl md:text-5xl font-bold text-zinc-900 mb-6">
              Unify everything.
            </h2>
            
            <p className="text-lg text-zinc-600 mb-8 leading-relaxed">
              Connect banks, ERPs, apps, and portals to unify enterprise data and automate, move, and control liquidity.
            </p>

            {/* Features List */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={{
                hidden: { opacity: 0 },
                visible: {
                  opacity: 1,
                  transition: { staggerChildren: 0.1 }
                }
              }}
              className="space-y-4"
            >
              {[
                "Connect to 9900+ banks, right out of the box.",
                "Streamline the payment journey for any ERP, globally.",
                "Accelerate data automation with open APIs."
              ].map((text, i) => (
                <motion.div
                  key={i}
                  variants={{
                    hidden: { opacity: 0, x: -20 },
                    visible: { opacity: 1, x: 0 }
                  }}
                  className="flex items-start gap-3"
                >
                  <div className="w-5 h-5 rounded-full bg-neon flex items-center justify-center flex-shrink-0 mt-1">
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="text-zinc-700">{text}</p>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>

          {/* Right Charts */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="relative"
          >
            <div className="bg-zinc-200 rounded-2xl p-8 shadow-xl">
              {/* Donut Chart Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="bg-zinc-800 rounded-xl p-6 mb-6"
              >
                <h3 className="text-sm font-semibold text-white mb-6">Cash Balances by Bank</h3>
                
                {/* Donut Chart */}
                <div className="relative w-64 h-64 mx-auto mb-6">
                  <svg viewBox="0 0 200 200" className="transform -rotate-90">
                    {/* Donut segments */}
                    <circle cx="100" cy="100" r="80" fill="none" stroke="#ec4899" strokeWidth="40" strokeDasharray="150 350" />
                    <circle cx="100" cy="100" r="80" fill="none" stroke="#a855f7" strokeWidth="40" strokeDasharray="100 400" strokeDashoffset="-150" />
                    <circle cx="100" cy="100" r="80" fill="none" stroke="#3b82f6" strokeWidth="40" strokeDasharray="80 420" strokeDashoffset="-250" />
                    <circle cx="100" cy="100" r="80" fill="none" stroke="#10b981" strokeWidth="40" strokeDasharray="70 430" strokeDashoffset="-330" />
                    <circle cx="100" cy="100" r="80" fill="none" stroke="#f59e0b" strokeWidth="40" strokeDasharray="100 400" strokeDashoffset="-400" />
                  </svg>
                </div>

                {/* Legend */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {[
                    { color: "bg-pink-500", value: "599K", label: "Chase" },
                    { color: "bg-purple-500", value: "3.4M", label: "Deutsche" },
                    { color: "bg-blue-500", value: "4.1M", label: "BNP" },
                    { color: "bg-green-500", value: "1.4B", label: "HSBC" }
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${item.color}`}></div>
                      <div className="text-white">
                        <div className="font-semibold">{item.value}</div>
                        <div className="text-xs text-zinc-400">{item.label}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Line Chart Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="bg-white rounded-xl p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-zinc-700">KYRIBA - GBP</h3>
                  <div className="text-xs text-zinc-500">KYRIBA - USD</div>
                </div>
                
                {/* Line Chart */}
                <div className="h-32">
                  <svg className="w-full h-full" viewBox="0 0 400 100">
                    {/* Grid lines */}
                    <line x1="0" y1="25" x2="400" y2="25" stroke="#e5e7eb" strokeWidth="1" />
                    <line x1="0" y1="50" x2="400" y2="50" stroke="#e5e7eb" strokeWidth="1" />
                    <line x1="0" y1="75" x2="400" y2="75" stroke="#e5e7eb" strokeWidth="1" />
                    
                    {/* Line chart */}
                    <polyline
                      points="0,60 50,55 100,50 150,45 200,40 250,35 300,30 350,25 400,20"
                      fill="none"
                      stroke="#ec4899"
                      strokeWidth="2"
                    />
                    
                    {/* Legend dots */}
                    <circle cx="20" cy="90" r="3" fill="#000" />
                    <circle cx="120" cy="90" r="3" fill="#e5e7eb" />
                    <circle cx="220" cy="90" r="3" fill="#e5e7eb" />
                  </svg>
                </div>
                
                <div className="flex items-center gap-4 text-xs text-zinc-500 mt-2">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-black"></div>
                    <span>Available</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-zinc-300"></div>
                    <span>Unused %</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-zinc-300"></div>
                    <span>Used %</span>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
