import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, Typography, Spin, Empty, Row, Col, DatePicker, Statistic, Progress, Space } from 'antd';
import type { DatePickerProps } from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import { database } from '@/firebaseConfig';
import { ref, get } from "firebase/database";
import { Text } from "@/components";
import { CheckCircleOutlined, CloseCircleOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import customParseFormat from 'dayjs/plugin/customParseFormat';
dayjs.extend(customParseFormat);


const { Title } = Typography;
const { RangePicker } = DatePicker;

interface FirebaseMaskLogEntry {
  status: 'Mask' | 'No Mask' | string; // Status dari Firebase
  timestamp: string; // String "YYYY-MM-DD HH:mm:ss"
  image_url?: string; // Opsional
}

interface MaskLogAggregate {
  maskOnCount: number;
  maskOffCount: number;
  // noFaceCount: 0, // Dihilangkan sementara karena tidak ada di contoh path
  totalDetections: number;
}

// Fungsi untuk mengambil dan mengagregasi data log masker dengan struktur path baru
const fetchAndAggregateMaskLogsNewPath = async (
  dateRange: [Dayjs, Dayjs],
): Promise<MaskLogAggregate> => {
  if (!dateRange || dateRange.length !== 2 || !dateRange[0] || !dateRange[1] || !dateRange[0].isValid() || !dateRange[1].isValid()) {
    console.warn("[MaskHistoryLog] fetchAndAggregateMaskLogs: dateRange is invalid.");
    return { maskOnCount: 0, maskOffCount: 0, totalDetections: 0 };
  }

  const [startDate, endDate] = dateRange;
  console.log(`[MaskHistoryLog] Fetching mask logs from ${startDate.format("YYYY-MM-DD")} to ${endDate.format("YYYY-MM-DD")}`);

  const aggregateResult: MaskLogAggregate = {
    maskOnCount: 0,
    maskOffCount: 0,
    totalDetections: 0,
  };

  const datesToFetch: Dayjs[] = [];
  let currentDate = startDate.clone();
  while (currentDate.isBefore(endDate) || currentDate.isSame(endDate, 'day')) {
    datesToFetch.push(currentDate.clone());
    currentDate = currentDate.add(1, 'day');
  }

  const processDayData = (dayDataSnapshot: any, dateForLog: Dayjs) => {
    if (!dayDataSnapshot.exists()) {
      // console.log(`[MaskHistoryLog] No data for date: ${dateForLog.format("YYYY-MM-DD")}`);
      return;
    }
    const dayData = dayDataSnapshot.val();

    // Proses sub-path 'mask'
    if (dayData.mask && typeof dayData.mask === 'object') {
      Object.values(dayData.mask).forEach((logEntry: any) => {
        const entry = logEntry as FirebaseMaskLogEntry;
        // Optional: Verifikasi timestamp jika diperlukan, tapi untuk agregasi cukup statusnya
        if (entry && entry.status) {
          aggregateResult.totalDetections++;
          if (String(entry.status).toLowerCase() === 'mask') {
            aggregateResult.maskOnCount++;
          }
        }
      });
    }

    // Proses sub-path 'no mask'
    if (dayData['no mask'] && typeof dayData['no mask'] === 'object') { // Perhatikan spasi di 'no mask'
      Object.values(dayData['no mask']).forEach((logEntry: any) => {
        const entry = logEntry as FirebaseMaskLogEntry;
        if (entry && entry.status) {
          aggregateResult.totalDetections++;
          if (String(entry.status).toLowerCase() === 'no mask') {
            aggregateResult.maskOffCount++;
          }
        }
      });
    }
  };

  const fetchPromises = datesToFetch.map(async (targetDate) => {
    const year = targetDate.format('YYYY');
    const month = targetDate.format('MM');
    const day = targetDate.format('DD');
    const basePathForDay = `mask_logs/${year}/${month}/${day}`;
    const dayRef = ref(database, basePathForDay);

    try {
      const daySnapshot = await get(dayRef);
      processDayData(daySnapshot, targetDate);
    } catch (error) {
      console.error(`[MaskHistoryLog] Error fetching from path ${basePathForDay}:`, error);
    }
  });

  await Promise.all(fetchPromises);
  console.log(`[MaskHistoryLog] Aggregation result:`, aggregateResult);
  return aggregateResult;
};


export const MaskHistoryLog = () => {
  const [selectedDateRange, setSelectedDateRange] = useState<[Dayjs, Dayjs]>([dayjs().subtract(6, 'days').startOf('day'), dayjs().endOf('day')]);
  const [aggregateData, setAggregateData] = useState<MaskLogAggregate | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadLogData = useCallback(async () => {
    if (!selectedDateRange || selectedDateRange.length !== 2) {
      setAggregateData(null);
      setIsLoading(false);
      setError("Pilih rentang tanggal yang valid.");
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchAndAggregateMaskLogsNewPath(selectedDateRange);
      setAggregateData(data);
    } catch (err: any) {
      console.error("[MaskHistoryLog] Error in loadLogData:", err);
      setError(`Gagal memuat riwayat penggunaan masker.`);
      setAggregateData(null);
    } finally {
      setIsLoading(false);
    }
  }, [selectedDateRange]);

  useEffect(() => {
    loadLogData();
  }, [loadLogData]);

  const handleDateRangeChange = (dates: [Dayjs | null, Dayjs | null] | null, dateStrings: [string, string]) => {
    if (dates && dates[0] && dates[1] && dates[0].isValid() && dates[1].isValid()) {
      setSelectedDateRange([dates[0].startOf('day'), dates[1].endOf('day')]);
    }
  };
  
  const calculatePercentage = (count: number, total: number) => {
    if (total === 0) return 0;
    return parseFloat(((count / total) * 100).toFixed(1));
  };

  return (
    <Card style={{ minHeight: '400px' }}>
      <Row justify="space-between" align="middle" style={{ marginBottom: 20 }}>
        <Col>
          <Title level={4}>
            Ringkasan Riwayat Penggunaan Masker
          </Title>
        </Col>
        <Col>
            <Space>
                <Text>Pilih Rentang Tanggal:</Text>
                <RangePicker 
                  value={selectedDateRange} 
                  onChange={handleDateRangeChange as any}
                  disabledDate={(current) => current && current > dayjs().endOf('day')}
                />
            </Space>
        </Col>
      </Row>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 250 }}><Spin size="large" /></div>
      ) : error ? (
        <Empty description={<Typography.Text type="danger">{error}</Typography.Text>} style={{ height: 250, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}/>
      ) : aggregateData && aggregateData.totalDetections > 0 ? (
        <Row gutter={[16, 24]} justify="center" align="middle" style={{paddingTop: 20}}>
          <Col xs={24} sm={12} md={8} style={{ textAlign: 'center' }}>
            <Statistic title="Total Deteksi" value={aggregateData.totalDetections} />
          </Col>
          <Col xs={24} sm={12} md={8} style={{ textAlign: 'center' }}>
            <Statistic 
              title="Memakai Masker" 
              value={aggregateData.maskOnCount} 
              prefix={<CheckCircleOutlined style={{ color: 'green' }}/>} 
            />
            <Progress 
              percent={calculatePercentage(aggregateData.maskOnCount, aggregateData.totalDetections)} 
              strokeColor="green" 
              style={{ maxWidth: 200, margin: '10px auto 0' }}
            />
          </Col>
          <Col xs={24} sm={12} md={8} style={{ textAlign: 'center' }}>
            <Statistic 
              title="Tidak Memakai Masker" 
              value={aggregateData.maskOffCount} 
              prefix={<CloseCircleOutlined style={{ color: 'red' }}/>} 
            />
             <Progress 
              percent={calculatePercentage(aggregateData.maskOffCount, aggregateData.totalDetections)} 
              strokeColor="red"
              style={{ maxWidth: 200, margin: '10px auto 0' }}
            />
          </Col>
          {/* Bagian NoFaceCount bisa ditambahkan kembali jika Anda memiliki status "No Face Detected" */}
        </Row>
      ) : (
        <Empty description={`Tidak ada data riwayat penggunaan masker untuk rentang tanggal yang dipilih.`} style={{ height: 250, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}/>
      )}
    </Card>
  );
};