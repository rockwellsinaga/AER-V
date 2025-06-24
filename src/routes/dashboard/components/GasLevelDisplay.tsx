import { Card, Col, Row, Statistic, Typography, Spin, Empty, Popover } from 'antd';
import { useEffect, useState, useRef } from 'react';
import { database } from '@/firebaseConfig';
import { ref, onValue, off, get } from "firebase/database";
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import { Line, LineConfig } from '@ant-design/plots'; // Impor Line chart

dayjs.extend(customParseFormat);

const { Title, Text } = Typography;

interface SensorData {
  C2H5OH_ppm?: number;
  H2S_ppm?: number;
  NO2_ppm?: number;
  last_updated?: string;
  [key: string]: number | undefined | string;
}

interface DisplayGasInfo {
  key: string;
  name: string;
  displayName: string;
  value: number;
  unit: string;
  status: 'Normal' | 'Warning' | 'Danger';
  history: { time: number; value: number }[];
}

const determineGasStatus = (gasKeyFirebase: string, value: number): DisplayGasInfo['status'] => {
  const gasType = String(gasKeyFirebase).replace('_ppm', '').toUpperCase();
  if (gasType === 'C2H5OH') {
    if (value > 2.0) return 'Danger'; if (value > 1.0) return 'Warning'; return 'Normal';
  }
  if (gasType === 'H2S') {
    if (value > 20) return 'Danger'; if (value > 10) return 'Warning'; return 'Normal';
  }
  if (gasType === 'NO2') {
    if (value > 4) return 'Danger'; if (value > 3) return 'Warning'; return 'Normal';
  }
  return 'Normal';
};

const MAX_HISTORY_POINTS = 20;

export const GasLevelDisplay = () => {
  const [currentSensorData, setCurrentSensorData] = useState<SensorData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  const gasHistoriesRef = useRef<Record<string, { time: number; value: number }[]>>({});

  useEffect(() => {
    console.log("[GasLevelDisplay] Component mounted. Setting up Firebase listener for 'sensor_data'.");
    setIsLoading(true);
    setError(null);

    const sensorDataRef = ref(database, 'sensor_data');

    const processData = (data: SensorData | null, source: string) => {
      console.log(`[GasLevelDisplay] Data received from ${source} for path 'sensor_data':`, data);
      if (data) {
        setCurrentSensorData(data);
        setError(null);

        const now = Date.now();
        const gasKeysToUpdate: string[] = ["C2H5OH_ppm", "H2S_ppm", "NO2_ppm"];
        
        gasKeysToUpdate.forEach(key => {
          const gasValue = data[key as keyof SensorData]; // Type assertion
          if (typeof gasValue === 'number') {
            if (!gasHistoriesRef.current[key]) {
              gasHistoriesRef.current[key] = [];
            }
            const history = gasHistoriesRef.current[key];
            history.push({ time: now, value: gasValue });
            if (history.length > MAX_HISTORY_POINTS) {
              history.shift();
            }
            // Untuk memaksa Popover update saat history berubah, kita perlu cara untuk memberi tahu React.
            // Salah satu cara adalah dengan menyalin objek ref atau state, tapi itu bisa rumit
            // dengan Popover yang dirender on-demand.
            // Alternatif: Popover mungkin perlu state sendiri atau di-trigger ulang.
            // Untuk kesederhanaan saat ini, kita biarkan ref diupdate.
            // Perubahan currentSensorData akan memicu re-render GasLevelDisplay,
            // dan displayGases akan mengambil history terbaru.
          }
        });

      } else {
        console.log(`[GasLevelDisplay] Node 'sensor_data' is empty or does not exist (from ${source}).`);
        setCurrentSensorData(null);
      }
    };

    get(sensorDataRef).then((snapshot) => {
      console.log("[GasLevelDisplay] Initial get() for 'sensor_data' successful.");
      processData(snapshot.val() as SensorData | null, "initial get()");
    }).catch((err) => {
      console.error("[GasLevelDisplay] Initial get() for 'sensor_data' failed:", err);
      setError("Gagal memuat data sensor awal.");
      setCurrentSensorData(null);
      setIsLoading(false);
    });

    const listener = onValue(sensorDataRef, (snapshot) => {
      console.log("[GasLevelDisplay] onValue() listener for 'sensor_data' triggered.");
      processData(snapshot.val() as SensorData | null, "onValue() listener");
      setIsLoading(false);
    }, (firebaseError) => {
      console.error("[GasLevelDisplay] onValue() listener for 'sensor_data' failed:", firebaseError);
      setError("Gagal mendapatkan pembaruan data sensor.");
      setIsLoading(false);
    });

    return () => {
      console.log("[GasLevelDisplay] Component unmounting. Detaching Firebase listener for 'sensor_data'.");
      off(sensorDataRef, 'value', listener);
    };
  }, []);

  const gasKeysToDisplay: string[] = ["C2H5OH_ppm", "H2S_ppm", "NO2_ppm"];

  const displayGases: DisplayGasInfo[] = currentSensorData
    ? gasKeysToDisplay
        .map(key => {
          const value = currentSensorData[key as keyof SensorData];
          if (typeof value === 'number') {
            const gasName = String(key).replace('_ppm', '');
            return {
              key: key,
              name: gasName,
              displayName: gasName.toUpperCase(),
              value: value,
              unit: 'ppm',
              status: determineGasStatus(key, value),
              history: gasHistoriesRef.current[key] || [],
            };
          }
          return null;
        })
        .filter((gas): gas is DisplayGasInfo => gas !== null)
    : [];

  const getStatusColor = (status: DisplayGasInfo['status']) => {
    switch (status) {
      case 'Normal': return 'green';
      case 'Warning': return 'orange';
      case 'Danger': return 'red';
      default: return 'black';
    }
  };

  const lastUpdatedTimestamp = currentSensorData?.last_updated && typeof currentSensorData.last_updated === 'string'
    ? dayjs(currentSensorData.last_updated, "YYYY-MM-DD HH:mm:ss", true).isValid()
        ? dayjs(currentSensorData.last_updated, "YYYY-MM-DD HH:mm:ss").format("DD MMM YYYY, HH:mm:ss")
        : "Format waktu tidak valid"
    : null;

  const renderHoverChart = (gasData: DisplayGasInfo) => {
    if (!gasData.history || gasData.history.length < 2) {
      return <Text>Data riwayat singkat tidak cukup untuk chart.</Text>;
    }

    const chartConfig: LineConfig = {
      data: gasData.history.map(h => ({ time: dayjs(h.time).format('HH:mm:ss'), value: h.value })),
      xField: 'time',
      yField: 'value',
      height: 120, // Sedikit tambah tinggi untuk judul axis
      width: 280, // Sedikit tambah lebar
      xAxis: { 
        title: { 
          text: 'Waktu', 
          style: { fontSize: 10 } // Perkecil font judul
        }, 
        tickCount: 3, 
        label: { style: { fontSize: 9 } }
      },
      yAxis: { 
        title: { 
          text: 'PPM', 
          style: { fontSize: 10 } // Perkecil font judul
        }, 
        tickCount: 3, 
        label: { 
          style: { fontSize: 9 }, 
          formatter: (v) => `${parseFloat(v).toFixed(1)}` 
        }
      },
      smooth: true,
      tooltip: {
          formatter: (datum) => ({ name: gasData.displayName, value: `${datum.value.toFixed(2)} ppm` }),
          customContent: (title, items) => {
            if (items && items.length > 0) {
                return (
                    <div style={{padding: '5px'}}>
                        <div>{items[0].name}: {items[0].value}</div>
                        <div style={{fontSize: '10px', color: 'gray'}}>{title}</div>
                    </div>
                );
            }
            return <></>;
        }
      },
      point: { size: 2.5, shape: 'circle' }, // Sedikit perbesar point
      lineStyle: { lineWidth: 1.5 },
      padding: [10, 15, 20, 25], // top, right, bottom, left - sesuaikan agar judul axis muat
      autoFit: false, // Set false jika width dan height sudah fix
    };
    return <div style={{ width: chartConfig.width, height: chartConfig.height }}><Line {...chartConfig} /></div>;
  };


  if (isLoading) {
    return (
      <Card title={<Title level={4}>Real-time Gas Concentration</Title>} style={{ height: '100%', minHeight: '220px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '150px' }}>
          <Spin size="large" tip="Memuat data sensor..." />
        </div>
      </Card>
    );
  }

  return (
    <Card title={<Title level={4}>Real-time Gas Concentration</Title>} style={{ height: '100%', minHeight: '220px' }}>
      {error && (
         <Text type="danger" style={{ display: 'block', marginBottom: '10px', textAlign: 'center' }}>
            Error: {error}
         </Text>
      )}
      {lastUpdatedTimestamp && (
        <Text type="secondary" style={{ display: 'block', textAlign: 'center', marginBottom: '15px', fontSize: '0.9em' }}>
          Pembaruan Terakhir: {lastUpdatedTimestamp}
        </Text>
      )}
      <Row gutter={[16, 16]}>
        {displayGases.length > 0 ? displayGases.map((gas) => (
          <Col xs={24} sm={24} md={8} key={gas.key}>
            <Popover 
              content={() => renderHoverChart(gas)} 
              title={`Riwayat Singkat ${gas.displayName}`} 
              trigger="hover" 
              placement="bottomLeft" // Coba placement berbeda jika perlu
              overlayStyle={{ width: (280 + 30) }} // Sesuaikan lebar Popover jika perlu agar pas dengan chart
            >
              <Card bordered hoverable>
                <Statistic
                  title={gas.displayName}
                  value={gas.value}
                  precision={2}
                  suffix={gas.unit}
                  valueStyle={{ color: getStatusColor(gas.status), fontSize: '1.5em' }}
                />
                <Text style={{ color: getStatusColor(gas.status) }}>
                  Status: {gas.status}
                </Text>
              </Card>
            </Popover>
          </Col>
        )) : (
          <Col span={24} style={{ textAlign: 'center' }}>
             <Empty description={!error ? "Tidak ada data sensor gas yang dapat ditampilkan saat ini." : "Gagal memuat data, coba lagi nanti."} style={{ minHeight: '100px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}/>
          </Col>
        )}
      </Row>
    </Card>
  );
};