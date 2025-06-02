import { Col, Row } from "antd";
import {
  GasLevelDisplay,
  MaskDetectionStatus,
  GasHistoryChart,
  MaskHistoryLog // DITAMBAHKAN
} from "./components";

export const DashboardPage = () => {
  return (
    <div className="page-container">
      <Row gutter={[32, 32]} style={{ marginBottom: '32px' }}>
        <Col xs={24} md={12}>
          <GasLevelDisplay />
        </Col>
        <Col xs={24} md={12}>
          <MaskDetectionStatus />
        </Col>
      </Row>
      <Row gutter={[32, 32]} style={{ marginBottom: '32px' }}> {/* Beri jarak antar chart */}
        <Col xs={24}>
          <GasHistoryChart />
        </Col>
      </Row>
      <Row gutter={[32, 32]}> {/* Baris baru untuk riwayat masker */}
        <Col xs={24}>
          <MaskHistoryLog />
        </Col>
      </Row>
    </div>
  );
};