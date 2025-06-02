import { Card, Col, Row, Typography, Image, Tag, Spin, Empty } from 'antd';
import { useEffect, useState } from 'react';
import { database } from '@/firebaseConfig'; // Pastikan path ini benar dan Firebase diinisialisasi
import { ref, onValue, off, get } from "firebase/database";
import dayjs from 'dayjs';
import 'dayjs/locale/id'; // Impor locale Indonesia
import customParseFormat from 'dayjs/plugin/customParseFormat';
// import { Text } from "@/components"; // Jika Anda punya komponen Text kustom, jika tidak gunakan Typography.Text
const { Text, Title } = Typography; // Menggunakan Text dari Ant Design jika komponen kustom tidak ada

dayjs.locale('id');
dayjs.extend(customParseFormat);

// ===================================================================================
// GANTI ALAMAT INI DENGAN ALAMAT IP DAN PORT SERVER FLASK ANDA YANG BENAR
// Jika React dan Flask berjalan di mesin yang sama untuk pengembangan: 'http://localhost:5000'
// Jika berbeda mesin di jaringan yang sama: 'http://192.168.18.50:5000' (sesuai IP server Flask Anda)
const FLASK_SERVER_URL = 'http://127.0.0.1:5000/'; 
// ===================================================================================


interface FaceDetectionData {
  current_status?: 'No one here' | 'Mask' | 'No Mask' | 'Starting detection...' | string;
  last_updated?: string | number;
  [key: string]: any;
}

export const MaskDetectionStatus = () => {
  const [detectionData, setDetectionData] = useState<FaceDetectionData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [firebaseError, setFirebaseError] = useState<string | null>(null);
  const [videoStreamError, setVideoStreamError] = useState<boolean>(false);

  useEffect(() => {
    console.log("[MaskDetectionStatus] Component mounted. Setting up Firebase listener for 'face_detection'."); // Menggunakan console.log
    setIsLoading(true);
    setFirebaseError(null);
    setVideoStreamError(false);

    const faceDetectionRef = ref(database, 'face_detection');

    const processData = (data: FaceDetectionData | null, source: string) => {
      console.log(`[MaskDetectionStatus] Data received from ${source} for path 'face_detection':`, data); // Menggunakan console.log
      if (data) {
        setDetectionData(data);
        setFirebaseError(null);
      } else {
        console.warn(`[MaskDetectionStatus] Node 'face_detection' is empty or does not exist (from ${source}).`); // Menggunakan console.warn
        setDetectionData(null);
      }
    };

    get(faceDetectionRef).then((snapshot) => {
      console.log("[MaskDetectionStatus] Initial get() for 'face_detection' successful."); // Menggunakan console.log
      processData(snapshot.val() as FaceDetectionData | null, "initial get()");
      setIsLoading(false); 
    }).catch((err) => {
      console.error("[MaskDetectionStatus] Initial get() for 'face_detection' failed:", err); // Menggunakan console.error
      setFirebaseError("Gagal memuat data deteksi awal dari Firebase.");
      setDetectionData(null);
      setIsLoading(false);
    });

    const listener = onValue(faceDetectionRef, (snapshot) => {
      console.log("[MaskDetectionStatus] onValue() listener for 'face_detection' triggered."); // Menggunakan console.log
      processData(snapshot.val() as FaceDetectionData | null, "onValue() listener");
      if(isLoading) setIsLoading(false); 
    }, (errorObject) => { 
      console.error("[MaskDetectionStatus] onValue() listener for 'face_detection' failed:", errorObject); // Menggunakan console.error
      setFirebaseError("Gagal mendapatkan pembaruan data dari Firebase.");
    });

    return () => {
      console.log("[MaskDetectionStatus] Component unmounting. Detaching Firebase listener for 'face_detection'."); // Menggunakan console.log
      off(faceDetectionRef, 'value', listener);
    };
  }, []); // isLoading dihilangkan dari dependency array untuk mencegah re-run listener yang tidak perlu

  const getStatusTagColor = (status?: FaceDetectionData['current_status']): string => {
    switch (String(status).toLowerCase()) { 
      case 'mask':
        return 'success';
      case 'no mask':
        return 'error';
      case 'no one here':
        return 'warning';
      case 'starting detection...':
        return 'processing';
      default:
        return 'default'; 
    }
  };

  let formattedTimestamp: string | null = null;
  if (detectionData?.last_updated) {
    if (typeof detectionData.last_updated === 'number') {
      formattedTimestamp = dayjs(detectionData.last_updated).format('DD MMM YYYY, HH:mm:ss');
    } else if (typeof detectionData.last_updated === 'string') {
      const parsedCustom = dayjs(detectionData.last_updated, "YYYY-MM-DD HH:mm:ss", true);
      if (parsedCustom.isValid()) {
        formattedTimestamp = parsedCustom.format('DD MMM YYYY, HH:mm:ss');
      } else {
        const parsedISO = dayjs(detectionData.last_updated);
        if (parsedISO.isValid()) {
            formattedTimestamp = parsedISO.format('DD MMM YYYY, HH:mm:ss');
        } else {
            formattedTimestamp = "Format waktu tidak valid";
            console.warn("Invalid date format for last_updated:", detectionData.last_updated); // Menggunakan console.warn
        }
      }
    }
  }

  if (isLoading) {
    return (
      <Card title={<Title level={4}>Live Mask Detection</Title>} style={{ height: '100%', minHeight: '380px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
          <Spin size="large" tip="Memuat status deteksi..." />
        </div>
      </Card>
    );
  }

  return (
    <Card title={<Title level={4}>Live Mask Detection</Title>} style={{ height: '100%', minHeight: '380px' }}>
      {firebaseError && (
          <Text type="danger" style={{ display: 'block', marginBottom: '10px', textAlign: 'center' }}>
            Error Firebase: {firebaseError}
          </Text>
      )}
      <Row gutter={[16, 16]} align="middle">
        <Col xs={24} md={12} style={{ textAlign: 'center' }}>
          {videoStreamError ? (
            <div style={{ width: '100%', minHeight: '250px', backgroundColor: '#fff0f0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '1px dashed #ffccc7', borderRadius: '8px', padding: '20px' }}>
              <Text type="danger" style={{marginBottom: '10px'}}>Gagal memuat video stream dari server.</Text>
              <Text type="secondary" style={{fontSize: '0.9em'}}>Pastikan server Flask berjalan dan dapat diakses.</Text>
            </div>
          ) : (
            <img
              src={`${FLASK_SERVER_URL}/video_feed?timestamp=${new Date().getTime()}`} 
              alt="Live Camera Feed - Mask Detection"
              width="100%"
              style={{ maxHeight: 300, objectFit: 'contain', border: '1px solid #f0f0f0', borderRadius: '8px' }}
              onError={() => {
                console.error(`Error loading video stream from: ${FLASK_SERVER_URL}/video_feed`); // Menggunakan console.error
                setVideoStreamError(true);
              }}
            />
          )}
        </Col>
        <Col xs={24} md={12}>
          <div style={{ marginBottom: '16px' }}>
            <Text strong style={{ fontSize: '1.1em' }}>Status Deteksi:</Text>
            <br />
            <Tag
              color={getStatusTagColor(detectionData?.current_status)}
              style={{ fontSize: '1.3em', padding: '8px 12px', marginTop: '8px' }}
            >
              {detectionData?.current_status || (firebaseError ? 'Error Firebase' : 'N/A')}
            </Tag>
          </div>
          {formattedTimestamp && (
            <div>
              <Text strong style={{ fontSize: '1.1em' }}>Pembaruan Terakhir:</Text>
              <br />
              <Text style={{ fontSize: '1em', marginTop: '4px', display: 'block' }}>{formattedTimestamp}</Text>
            </div>
          )}
          {!detectionData && !firebaseError && !isLoading && ( 
             <Empty description={"Menunggu data deteksi dari Firebase..."} style={{ marginTop: '20px' }}/>
          )}
        </Col>
      </Row>
    </Card>
  );
};