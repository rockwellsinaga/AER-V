import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, Typography, Spin, Empty, Select, Row, Col, Space, DatePicker, Checkbox } from 'antd';
// --- MODIFIED: Cara impor CheckboxValueType ---
import type { CheckboxValueType } from 'antd/es/checkbox/interface'; // Path yang lebih umum dan biasanya benar
// Jika path di atas tidak bekerja, coba alternatif yang disarankan error (meskipun yang di atas lebih standar):
// import type CheckboxValueType from 'antd/es/checkbox/Group';
// Atau, jika CheckboxValueType diekspor langsung dari 'antd' (tergantung versi antd):
// import type { CheckboxValueType } from 'antd';

import { Line, LineConfig } from '@ant-design/plots';
import dayjs, { Dayjs } from 'dayjs';
import { database } from '@/firebaseConfig';
import { ref, get } from "firebase/database";
import { Text } from "@/components";

const { Title } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;


interface ProcessedChartData {
  timestamp: number;
  timeFormatted: string;
  value: number;
  type: string;
}

interface RawLogEntry {
  [gasKeyInFirebase: string]: number;
}

const fetchPpmLogsForDateRange = async (
  gasTypes: string[],
  dateRange: [Dayjs, Dayjs],
): Promise<ProcessedChartData[]> => {
  if (!gasTypes || gasTypes.length === 0) {
    console.warn("[GasHistoryChart] fetchPpmLogs: gasTypes array is empty.");
    return [];
  }
  if (!dateRange || dateRange.length !== 2 || !dateRange[0] || !dateRange[1] || !dateRange[0].isValid() || !dateRange[1].isValid()) {
    console.warn("[GasHistoryChart] fetchPpmLogs: dateRange is invalid.");
    return [];
  }

  const [startDate, endDate] = dateRange;
  console.log(`[GasHistoryChart] Fetching PPM logs for gases: [${gasTypes.join(", ")}] from ${startDate.format("YYYY-MM-DD")} to ${endDate.format("YYYY-MM-DD")}`);

  const allProcessedLogs: ProcessedChartData[] = [];
  const datesToFetch: Dayjs[] = [];
  let currentDate = startDate.clone();
  while (currentDate.isBefore(endDate) || currentDate.isSame(endDate, 'day')) {
    datesToFetch.push(currentDate.clone());
    currentDate = currentDate.add(1, 'day');
  }

  const fetchPromises = datesToFetch.map(async (targetDate) => {
    const year = targetDate.format('YYYY');
    const month = targetDate.format('MM');
    const day = targetDate.format('DD');
    const basePathForDay = `ppm_logs/${year}/${month}/${day}`;

    const dayRef = ref(database, basePathForDay);
    try {
      const daySnapshot = await get(dayRef);
      if (daySnapshot.exists()) {
        const hoursData = daySnapshot.val();
        Object.keys(hoursData).forEach(hour => {
          if (!hoursData[hour] || typeof hoursData[hour] !== 'object') return;
          const minutesData = hoursData[hour];
          Object.keys(minutesData).forEach(minute => {
            if (!minutesData[minute] || typeof minutesData[minute] !== 'object') return;
            const gasReadingsAtMinute: RawLogEntry = minutesData[minute];
            
            const reconstructedTimestamp = dayjs(`${year}-${month}-${day} ${hour}:${minute}:00`, "YYYY-MM-DD HH:mm:ss").valueOf();

            gasTypes.forEach(gasType => {
              const gasKeyInFirebase = `${gasType.toUpperCase()}_ppm`;
              if (gasReadingsAtMinute && typeof gasReadingsAtMinute[gasKeyInFirebase] === 'number') {
                allProcessedLogs.push({
                  timestamp: reconstructedTimestamp,
                  timeFormatted: dayjs(reconstructedTimestamp).format('YYYY-MM-DD HH:mm'),
                  value: gasReadingsAtMinute[gasKeyInFirebase],
                  type: gasType.toUpperCase(),
                });
              }
            });
          });
        });
      }
    } catch (error) {
      console.error(`[GasHistoryChart] Error fetching from path ${basePathForDay}:`, error);
    }
  });

  await Promise.all(fetchPromises);
  console.log(`[GasHistoryChart] Total logs fetched before sort: ${allProcessedLogs.length}`);
  return allProcessedLogs.sort((a, b) => a.timestamp - b.timestamp);
};


export const GasHistoryChart = () => {
  const allAvailableGases = useMemo(() => ['C2H5OH', 'H2S', 'NO2'], []);
  
  const [selectedDateRange, setSelectedDateRange] = useState<[Dayjs, Dayjs]>([dayjs().subtract(6, 'days').startOf('day'), dayjs().endOf('day')]);
  // Tipe CheckboxValueType digunakan di sini
  const [selectedGases, setSelectedGases] = useState<CheckboxValueType[]>(allAvailableGases);
  
  const [chartData, setChartData] = useState<ProcessedChartData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadChartData = useCallback(async () => {
    if (selectedGases.length === 0 || !selectedDateRange || selectedDateRange.length !== 2) {
      setChartData([]);
      setIsLoading(false);
      setError(selectedGases.length === 0 ? "Pilih minimal satu jenis gas." : "Pilih rentang tanggal yang valid.");
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchPpmLogsForDateRange(selectedGases as string[], selectedDateRange);
      setChartData(data);
      if (data.length === 0) {
        console.log(`[GasHistoryChart] No data processed for selected gases and date range.`);
      }
    } catch (err: any) {
      console.error("[GasHistoryChart] Error in loadChartData:", err);
      setError(`Gagal memuat riwayat gas.`);
      setChartData([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedGases, selectedDateRange]);

  useEffect(() => {
    loadChartData();
  }, [loadChartData]);

  const handleDateRangeChange = (dates: [Dayjs | null, Dayjs | null] | null) => {
    if (dates && dates[0] && dates[1] && dates[0].isValid() && dates[1].isValid()) {
      setSelectedDateRange([dates[0].startOf('day'), dates[1].endOf('day')]);
    } else {
      setSelectedDateRange([dayjs().subtract(6, 'days').startOf('day'), dayjs().endOf('day')]);
    }
  };

  // Tipe CheckboxValueType digunakan di sini
  const handleGasSelectionChange = (checkedValues: CheckboxValueType[]) => {
    setSelectedGases(checkedValues);
  };

  const aggregatedFormattedData = useMemo(() => {
    let dataToProcess = chartData;
    if (selectedDateRange && selectedDateRange[0].diff(selectedDateRange[1], 'day') < -2 && dataToProcess.length > 1000) {
        console.log(`[GasHistoryChart] Aggregating ${dataToProcess.length} data points...`);
        const aggregated: ProcessedChartData[] = [];
        const groupedByGas: Record<string, ProcessedChartData[]> = {};

        dataToProcess.forEach(item => {
            if(!groupedByGas[item.type]) groupedByGas[item.type] = [];
            groupedByGas[item.type].push(item);
        });

        Object.keys(groupedByGas).forEach(gasType => {
            const gasData = groupedByGas[gasType];
            const tempAggregated: { [key: string]: { sum: number; count: number; timestamp: number; type: string } } = {};
            const groupFormat = 'YYYY-MM-DD HH';

            gasData.forEach(item => {
                const groupKey = dayjs(item.timestamp).format(groupFormat);
                if (!tempAggregated[groupKey]) {
                    tempAggregated[groupKey] = { sum: 0, count: 0, timestamp: dayjs(item.timestamp).startOf('hour').valueOf(), type: gasType };
                }
                tempAggregated[groupKey].sum += item.value;
                tempAggregated[groupKey].count += 1;
            });
            Object.values(tempAggregated).forEach(group => {
                aggregated.push({
                    timestamp: group.timestamp,
                    timeFormatted: dayjs(group.timestamp).format('YYYY-MM-DD HH:mm'),
                    value: parseFloat((group.sum / group.count).toFixed(2)),
                    type: group.type,
                });
            });
        });
        console.log(`[GasHistoryChart] Data aggregated to ${aggregated.length} points.`);
        return aggregated.sort((a,b) => a.timestamp - b.timestamp);
    }
    return dataToProcess;
  }, [chartData, selectedDateRange]);


  const chartConfig: LineConfig = {
    data: aggregatedFormattedData,
    xField: 'timeFormatted',
    yField: 'value',
    seriesField: 'type',
    xAxis: {
      label: { autoHide: true, autoRotate: false, formatter: (text) => text },
      title: { text: 'Waktu' }
    },
    yAxis: {
      label: { formatter: (v) => `${v} PPM` },
      title: { text: `Kadar Gas (PPM)` }
    },
    tooltip: {
      formatter: (datum) => {
        return { name: datum.type, value: `${datum.value} PPM (${dayjs(datum.timestamp).format('DD MMM YY, HH:mm')})` };
      },
    },
    legend: {
      position: 'top-right',
    },
    smooth: true,
    height: 350,
    padding: 'auto',
  };

  return (
    <Card style={{ minHeight: '520px' }}>
      <Row justify="space-between" align="middle" style={{ marginBottom: 10 }}>
        <Col>
          <Title level={4}>
            Riwayat Kadar Gas
          </Title>
        </Col>
        <Col>
          <Space>
            <Text>Rentang Tanggal:</Text>
            <RangePicker 
              value={selectedDateRange} 
              onChange={handleDateRangeChange}
              disabledDate={(current) => current && current > dayjs().endOf('day')}
            />
          </Space>
        </Col>
      </Row>
      <Row style={{ marginBottom: 20 }}>
        <Col span={24}>
            <Text style={{ marginRight: 8 }}>Pilih Gas:</Text>
            <Checkbox.Group 
                options={allAvailableGases.map(gas => ({ label: gas.toUpperCase(), value: gas }))} 
                value={selectedGases} 
                onChange={handleGasSelectionChange} 
            />
        </Col>
      </Row>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 350 }}><Spin size="large" /></div>
      ) : error ? (
        <Empty description={<Typography.Text type="danger">{error}</Typography.Text>} style={{ height: 350, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}/>
      ) : chartData.length > 0 ? (
        <Line {...chartConfig} />
      ) : (
        <Empty description={"Tidak ada data riwayat untuk gas dan rentang tanggal yang dipilih."} style={{ height: 350, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}/>
      )}
    </Card>
  );
};