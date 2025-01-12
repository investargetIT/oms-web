/* eslint-disable @typescript-eslint/no-shadow */
/* eslint-disable @typescript-eslint/no-use-before-define */

import Dtitle from '@/pages/components/Dtitle';
import ProForm, { ModalForm } from '@ant-design/pro-form';
import type { ProColumns } from '@ant-design/pro-table';
import ProTable from '@ant-design/pro-table';
import { useLocation, useModel, history } from 'umi';
import { Row, Col, Button, Card, Form, message, Modal, Space, InputNumber, Tag } from 'antd';
import { useEffect, useRef, useState } from 'react';
import InvoiceInfo from './components/InvoiceInfo';
import InvoiceDeliverInfo from './components/InvoiceDeliverInfo';
import ApplicationContent from './components/ApplicationContent';
import OrderInfo from './components/OrderInfo';
import UploadFile from './components/UploadFile';
import '../index.less';
import './style.less';
import SplitInvoice from './components/SplitInvoice';
import InvoicePreview from './components/InvoicePreview';
import {
  queryLoanDetails,
  saveLoan,
  submitLoan,
  invoicePreviewLoan,
  invoiceDetailLoan,
  splitInvoiceLoan,
} from '@/services/loan';
import Cookies from 'js-cookie';
import SearchAddressInvoice from '@/pages/InquirySheet/Offer/components/SearchAddressInvoice';
import SearchInvoice from '@/pages/InquirySheet/Offer/components/SearchInvoice';
import type { ActionType } from '@ant-design/pro-table';
import { getCompanyList, saveRefResource } from '@/services/SalesOrder/index';
import UploadForm from '@/pages/SalesOrder/components/UploadForm';
interface AddProps {
  id?: string;
}
type TableListItem = Record<string, any>;

const Edit: React.FC<AddProps> = () => {
  const {
    query: { LoanApplyNo = '' as any, type = '' as any },
  } = useLocation() as any;
  const { destroyCom } = useModel('tabSelect');
  const [form] = Form.useForm();
  const [info, setInfo] = useState<any>({});
  const [invoiceList, setInvoiceList] = useState<any>({});
  const [modalVisibleInvice, setModalVisibleInvice] = useState<boolean>(false);
  const [modalVisibleAddressInvoice, setModalVisibleAddressInvoice] = useState<any>(false);
  const [modalVisibleUpload, setModalVisibleUpload] = useState<any>(false);
  const [uploadList, setUploadList] = useState<any>([]);
  const [rowData, setRowData] = useState<any>({});
  const [addressList, setAddressList] = useState<any>({});
  const [ids, setIds] = useState<any>([]);
  const [fileRowsData, setFileRowsData] = useState<any>([]);
  const [loading, setLoading] = useState<any>(false);
  const [btnType, setBtnType] = useState<any>(null);
  const formRef = useRef<any>();
  const [isUpload, setIsUpload] = useState<any>(false); //追加附件
  const [splitInfo, setSplitInfo] = useState<any>({}); //拆分发票详情
  const [splitPreview, setSplitPreview] = useState<any>({}); //拆分发票预览
  const [splitVisible, setSplitVisible] = useState<any>(false); //拆分发票
  const [previewVisible, setInvoicePreview] = useState<any>(false); //拆分预览
  const [allDisable, setAllDisable] = useState<any>(false); //详情禁用
  const [applyPriceHide, setApplyPriceHide] = useState<boolean>(false); //借贷类型判断是否编辑【申请开票小计含税】
  const [splitHide, setSplitHide] = useState<boolean>(false); //拆分发票才显示的字段
  const [invoiceDisabled, setInvoice] = useState<boolean>(true); //更换发票抬头
  const [getApplyTotalAmount, setApplyTotalAmount] = useState<any>(''); //申请开票总金额含税
  const [getApplyMarginPrice, setApplyMarginPrice] = useState<any>(''); //申请价差
  const [channelVal, setChannelVal] = useState<any>(''); //渠道号
  const [tabInfo, setTabInfo] = useState<any>([]);
  const [tableData, setTableData] = useState<any>([]);
  const [cpList, setCpList] = useState<any>([]); //开票主体
  const [tableRowData, setTableRowData]: any = useState({});
  const [leftTable, setleftTable]: any = useState([]);

  const loanRef: any = useRef('');
  const SplitInvoiceRef: any = useRef<ActionType>();
  const location = useLocation();
  const handleOk = async () => {
    if (tabInfo.length < 2) {
      return message.error('拆开发票数量不可小于2');
    }
    const hasarr: any = []; //?存放还没拆的数据
    for (let i = 0; i < leftTable.length; i++) {
      const element = leftTable[i];
      if (element.sku === 'S00001') {
        continue;
      } else if (element.sku !== 'S00001' && element.detachableQty > 0) {
        //?当还有可拆数量的时候，把这一项放进hasarr
        hasarr.push({
          sku: element.sku,
          qty: element.detachableQty,
        });
      }
    }
    let freightSum = 0; //? 已拆的运费的总价
    //?这个for循环用来算总运费
    for (let i = 0; i < tabInfo.length; i++) {
      const element = tabInfo[i];
      for (let j = 0; j < element.arr.length; j++) {
        const ele = element.arr[j];
        if (ele.sku === 'S00001') {
          freightSum += ele.splitSubtotalPrice;
        } else {
          continue;
        }
      }
    }
    //?如果已拆运费小于总运费处理
    if (freightSum < splitInfo?.loanOriginalInvoiceVo?.originalFreight) {
      hasarr.push({
        sku: 'S00001',
        qty: splitInfo?.loanOriginalInvoiceVo?.originalFreight - freightSum,
      });
    }
    if (hasarr.length > 0) {
      return Modal.error({
        title: '原发票尚有部分明细未拆分',
        content: hasarr.map((ele: any) => {
          let mes;
          if (ele.sku === 'S00001') {
            mes = '可拆金额为';
          } else {
            mes = '可拆数量为';
          }
          return (
            <div key={ele.itemNo}>
              {ele.sku}
              {mes}
              {channelVal == 22 ? ele.qty.toFixed(2) : ele.qty}
            </div>
          );
        }),
      });
    }
    const arr: any = tabInfo?.map((v: any, index: any) => {
      v.arr = v.arr.map((item) => {
        return {
          ...item,
          sid: null,
          dismantledQty: splitInfo.loanOriginalInvoiceVo.lineVos[0].originalQty,
          detachableQty: 0,
          splitSubtotalPrice: Number(item.splitSubtotalPrice.toFixed(2)),
        };
      });
      return {
        sid: v.sid || null,
        loanApplyNo: info?.applyVo?.loanApplyNo,
        invoiceName: `发票${index + 1}`,
        invoiceNameIndex: index,
        lineList: v.arr,
      };
    });
    splitInfo.loanOriginalInvoiceVo.lineVos = splitInfo.loanOriginalInvoiceVo?.lineVos?.map(
      (item: { detachableQty: any; dismantledQty: any }) => {
        return {
          ...item,
          dismantledQty: splitInfo.loanOriginalInvoiceVo.lineVos[0].originalQty,
          detachableQty: 0,
        };
      },
    );
    const par = {
      sid: info?.applyVo?.sid,
      loanApplyNo: splitInfo?.loanOriginalInvoiceVo?.loanApplyNo,
      loanOriginalInvoiceVo: {
        ...splitInfo.loanOriginalInvoiceVo,
        lineVos: splitInfo.loanOriginalInvoiceVo.lineVos,
        splitFreight: freightSum || null,
      }, //?原开票的信息
      loanInvoiceVos: arr,
    };
    const { errCode, errMsg, data } = await splitInvoiceLoan(par); // 仅保存
    if (errCode == 200) {
      data.dataList = data?.dataList?.map((item: any, index: any) => {
        return {
          ...item,
          splitInvoiceNameIndex: index,
        };
      });
      setTableData(data?.dataList);
      message.success('保存成功');
      setSplitVisible(false);
    } else {
      message.error(errMsg);
    }
  };

  const handleCancel = () => {
    setSplitVisible(false);
  };
  const handlePreview = () => {
    setInvoicePreview(false);
  };

  const CancelPreview = () => {
    setInvoicePreview(false);
  };
  const loadList = async (val: any) => {
    const resourceVOList: any = [];
    val.forEach((e: any) => {
      resourceVOList.push({
        resourceName: e.resourceName,
        resourceUrl: e.resourceUrl,
        fileType: 'po附件',
      });
    });
    const params = {
      sourceId: info?.applyVo?.sid,
      sourceType: 130,
      resourceVOList,
    };
    const resSave = await saveRefResource(params);
    // 刷接口
    if (resSave.errCode === 200) {
      getApplyList(LoanApplyNo);
      setIsUpload(false);
    }
  };
  const fileColumns: ProColumns<any>[] = [
    { title: '文件名称', dataIndex: 'resourceName', width: 150 },
    {
      title: '操作',
      dataIndex: 'option',
      valueType: 'option',
      render: (_, record: any) => {
        return (
          <Space>
            <Button
              type="link"
              target="_blank"
              href={`${record.resourceUrl}?token=${Cookies.get('ssoToken')}`}
              key={'down'}
            >
              下载
            </Button>
            <Button
              disabled={allDisable}
              size="small"
              type="link"
              key={'remove'}
              onClick={() => {
                Modal.confirm({
                  title: '确认删除吗？',
                  content: '',
                  okText: '确认',
                  cancelText: '取消',
                  onOk: async () => {
                    setUploadList(
                      uploadList.filter((io: any) => io.resourceName != record.resourceName),
                    );
                    message.success('已删除文件');
                  },
                });
              }}
            >
              移除
            </Button>
          </Space>
        );
      },
    },
  ];
  useEffect(() => {}, []);
  useEffect(() => {
    if (type == 'detail') {
      setAllDisable(true);
    } else {
      setAllDisable(false);
    }
    getApplyList(LoanApplyNo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location]);

  const submit = async (val: any) => {
    if (val == 0) {
      setBtnType(1);
      formRef.current?.validateFieldsReturnFormatValue?.().then(async (values: any) => {
        if (values?.loanApplyType === 'EO3') {
          for (let i = 0; i < tableData?.length; i++) {
            if (!tableData[i]?.splitQty || tableData[i]?.splitQty == 0) {
              return message.error('请先拆分发票');
            }
          }
        }
        if (values?.loanApplyType === 'EO2' || values?.loanApplyType === 'EO5') {
          for (let i = 0; i < tableData?.length; i++) {
            if (tableData[i]?.applySubtotalPrice < 0 && tableData[i]?.sku == 'S00001') {
              return message.error('S00001申请开票小计含税必须大于等于0');
            }
            if (tableData[i]?.applySubtotalPrice <= 0 && tableData[i]?.sku != 'S00001') {
              return message.error('此sku申请开票小计含税必须大于0');
            }
          }
        }
        if (values?.loanApplyType === 'EO5') {
          if (!values?.applyRemarks) {
            return message.error('借贷类型为其他(请备注)，请输入申请备注');
          }
        }
        const delUpload = info.resourceList?.filter((item: any) => !uploadList?.includes(item));
        const newSid = delUpload?.map((arr: { sid: any }) => {
          return arr?.sid;
        });
        const result = cpList.find((item: { label: any }) => {
          return values?.billSubject === item.label;
        });

        let par;
        if (info?.applyVo?.readOnly === 1) {
          par = {
            applyVo: {
              applyTitle: values?.applyTitle,
              changeHeaderFlag: values?.changeHeaderFlag,
              applyRemarks: values?.applyRemarks,
              billSubject: info?.applyVo?.billSubject,
              billSubjectCode: info?.applyVo?.billSubjectCode,
              readOnly: info?.applyVo?.readOnly,
              loanApplyChannel: info?.applyVo?.loanApplyChannel,
              loanApplyNo: info?.applyVo?.loanApplyNo,
              totalAmount: tableRowData?.totalAmount,
              loanApplyType: info?.applyVo?.loanApplyType,
              systemInvoiceNo: info?.applyVo?.systemInvoiceNo,
              sid: info?.applyVo?.sid,
            },
            lineList: tableData,
            resourceList: uploadList,
            delFileIdList: newSid,
          };
        } else {
          let vCode;
          if (values?.vatTypeName == '增值税专用发票') {
            vCode = '01';
          } else if (values?.vatTypeName == '普通发票') {
            vCode = '02';
          } else {
            vCode = '04';
          }
          const sapCode = !addressList?.invoiceSapCode
            ? info?.applyVo?.invoiceSapCode
            : addressList.invoiceSapCode;
          const vatCompanyCode = !invoiceList?.customerCode
            ? info?.applyVo?.vatCompanyCode
            : invoiceList?.customerCode;
          const vatCompanyName = !invoiceList?.invoiceTitle
            ? info?.applyVo?.vatCompanyName
            : invoiceList?.invoiceTitle;
          par = {
            applyVo: {
              ...values,
              ...info?.invoiceInfo,
              billSubjectCode: result?.key,
              companyCode: info?.applyVo?.companyCode,
              orderType: info?.applyVo?.orderType,
              deptCode: info?.applyVo?.deptCode,
              salesId: info?.applyVo?.salesId,
              loanApplyChannel: info?.applyVo?.loanApplyChannel,
              originalChannel: info?.applyVo?.originalChannel,
              readOnly: info?.applyVo?.readOnly,
              totalAmount: tableRowData?.totalAmount,
              sid: info?.applyVo?.sid,
              loanApplyNo: info?.applyVo?.loanApplyNo,
              invoiceSapCode: sapCode,
              vatCompanyCode: vatCompanyCode,
              vatCompanyName: vatCompanyName,
              vatTypeName: values?.vatTypeName,
              vatTypeCode: vCode,
              purchaseCode: info?.applyVo?.purchaseCode,
            },
            lineList: tableData,
            resourceList: uploadList,
            delFileIdList: newSid,
          };
        }
        const { errCode, errMsg } = await saveLoan(par);
        if (errCode === 200) {
          message.success('提交申请成功');
          setLoading(false);
          resetFrom();
          history.push({
            pathname: '/to-loan/apply/index',
            state: {
              reload: '1',
            },
          });
        } else {
          setLoading(false);
          message.error(errMsg);
        }
      });
    }
    if (val == 1) {
      setBtnType(1);
      if (uploadList.length === 0) {
        return message.error('请先选择附件');
      }
      formRef.current?.validateFieldsReturnFormatValue?.().then(async (values: any) => {
        if (values?.loanApplyType === 'EO3') {
          for (let i = 0; i < tableData?.length; i++) {
            if (!tableData[i]?.splitQty || tableData[i]?.splitQty == 0) {
              return message.error('请先拆分发票');
            }
          }
        }
        if (values?.loanApplyType === 'EO2' || values?.loanApplyType === 'EO5') {
          for (let i = 0; i < tableData?.length; i++) {
            if (tableData[i]?.applySubtotalPrice < 0 && tableData[i]?.sku == 'S00001') {
              return message.error('S00001申请开票小计含税必须大于等于0');
            }
            if (tableData[i]?.applySubtotalPrice <= 0 && tableData[i]?.sku != 'S00001') {
              return message.error('此sku申请开票小计含税必须大于0');
            }
          }
        }

        const delUpload = info.resourceList?.filter((item: any) => !uploadList?.includes(item));
        const newSid = delUpload?.map((arr: { sid: any }) => {
          return arr?.sid;
        });
        const result = cpList.find((item: { label: any }) => {
          return values?.billSubject === item.label;
        });

        let par;
        if (info?.applyVo?.readOnly === 1) {
          par = {
            applyVo: {
              applyTitle: values?.applyTitle,
              changeHeaderFlag: values?.changeHeaderFlag,
              applyRemarks: values?.applyRemarks,
              billSubject: info?.applyVo?.billSubject,
              billSubjectCode: info?.applyVo?.billSubjectCode,
              readOnly: info?.applyVo?.readOnly,
              loanApplyChannel: info?.applyVo?.loanApplyChannel,
              loanApplyNo: info?.applyVo?.loanApplyNo,
              totalAmount: tableRowData?.totalAmount,
              loanApplyType: info?.applyVo?.loanApplyType,
              systemInvoiceNo: info?.applyVo?.systemInvoiceNo,
              sid: info?.applyVo?.sid,
            },
            lineList: tableData,
            resourceList: uploadList,
            delFileIdList: newSid,
          };
        } else {
          let vCode;
          if (values?.vatTypeName == '增值税专用发票') {
            vCode = '01';
          } else if (values?.vatTypeName == '普通发票') {
            vCode = '02';
          } else {
            vCode = '04';
          }

          const sapCode = !addressList?.invoiceSapCode
            ? info?.applyVo?.invoiceSapCode
            : addressList.invoiceSapCode;
          const vatCompanyCode = !invoiceList?.customerCode
            ? info?.applyVo?.vatCompanyCode
            : invoiceList?.customerCode;
          const vatCompanyName = !invoiceList?.invoiceTitle
            ? info?.applyVo?.vatCompanyName
            : invoiceList?.invoiceTitle;
          par = {
            applyVo: {
              ...values,
              ...info?.invoiceInfo,
              billSubjectCode: result?.key,
              companyCode: info?.applyVo?.companyCode,
              orderType: info?.applyVo?.orderType,
              deptCode: info?.applyVo?.deptCode,
              salesId: info?.applyVo?.salesId,
              loanApplyChannel: info?.applyVo?.loanApplyChannel,
              originalChannel: info?.applyVo?.originalChannel,
              readOnly: info?.applyVo?.readOnly,
              totalAmount: tableRowData?.totalAmount,
              sid: info?.applyVo?.sid,
              loanApplyNo: info?.applyVo?.loanApplyNo,
              invoiceSapCode: sapCode,
              vatCompanyCode: vatCompanyCode,
              vatCompanyName: vatCompanyName,
              vatTypeName: values?.vatTypeName,
              vatTypeCode: vCode,
              purchaseCode: info?.applyVo?.purchaseCode,
            },
            lineList: tableData,
            resourceList: uploadList,
            delFileIdList: newSid,
          };
        }

        const { errCode, errMsg } = await submitLoan(par);
        if (errCode === 200) {
          message.success('提交申请成功');
          setLoading(false);
          resetFrom();
          history.push({
            pathname: '/to-loan/apply/index',
            state: {
              reload: '1',
            },
          });
        } else {
          setLoading(false);
          message.error(errMsg);
        }
      });
    }
  };

  const [tempList, setTempList] = useState<any>([]);
  const showList = (arr: any) => {
    setTempList(arr);
  };
  const resetFrom = () => {
    setInfo([]);
    form.resetFields();
  };
  const delFile = () => {
    const nameList = fileRowsData.map((io: any) => io.resourceName);
    if (ids.length === 0) {
      message.error('请选择要删除的文件');
      return false;
    } else {
      Modal.confirm({
        title: '确认删除吗？',
        content: '',
        okText: '确认',
        cancelText: '取消',
        onOk: async () => {
          const newList = uploadList.filter(
            (io: any) => !nameList.some((ic: any) => io.resourceName === ic),
          );
          setUploadList(newList);
        },
      });
    }
  };
  //根据借贷类型判断表头信息是否显示
  const handlePriceHide = (e: boolean | ((prevState: boolean) => boolean)) => {
    setApplyPriceHide(e);
  };
  const handleSplitHide = (e: boolean | ((prevState: boolean) => boolean)) => {
    setSplitHide(e);
  };
  //更换开票抬头修改开票信息
  const updateInvoice = (e: boolean | ((prevState: boolean) => boolean)) => {
    setInvoice(e);
  };
  // 发票明细
  const infoColumn: ProColumns<any>[] = [
    {
      title: '序号',
      dataIndex: 'index',
      valueType: 'index',
      width: 50,
      fixed: 'left',
      render(text, record, index) {
        return index + 1;
        //return <span>{(currentPage4 - 1) * currentPageSize4 + index + 1}</span>;
      },
    },
    { title: 'SKU', dataIndex: 'sku', width: 120, fixed: 'left' },
    { title: '开票数量', dataIndex: 'originalQty', width: 100, fixed: 'left' },
    { title: '开票小计含税 ', dataIndex: 'originaSubtotalPrice', width: 150, fixed: 'left' },
    {
      title: '拆入发票',
      dataIndex: 'splitInvoiceName',
      width: 120,
      hideInTable: splitHide,
      className: 'red',
    },
    {
      title: '拆入数量',
      dataIndex: 'splitQty',
      width: 100,
      hideInTable: splitHide,
      className: 'red',
    },
    {
      title: '拆分开票小计含税 ',
      dataIndex: 'splitSubtotalPrice',
      width: 150,
      hideInTable: splitHide,
      className: 'blue',
    },
    {
      title: '申请开票小计含税',
      dataIndex: 'applySubtotalPrice',
      className: 'red',
      width: 150,
      hideInTable: applyPriceHide,
      render: (_, record: any) => {
        return (
          <InputNumber
            placeholder="请输入"
            disabled={allDisable}
            //   min={0}
            step="0.01"
            precision={2}
            formatter={(value) => {
              return `${value}`.replace(/^(\-)*(\d+)\.(\d\d).*$/, '$1$2.$3');
            }}
            defaultValue={record.applySubtotalPrice}
            onChange={(val: any) => {
              record.applySubtotalPrice = (parseInt(val * 100) / 100).toFixed(2); //不四舍五入
              if (record.sku === 'S00001' && val < 0) {
                message.error('S00001申请开票小计含税必须大于等于0');
                // record.applySubtotalPrice = 0;
              }
              if (record.sku !== 'S00001' && val <= 0) {
                message.error('此sku申请开票小计含税必须大于0');
                //  record.applySubtotalPrice = 0.01;
              }
              //申请开票总金额含税
              let sum = 0;
              tableData?.map((item: { applySubtotalPrice: number }) => {
                if (item?.applySubtotalPrice) {
                  sum += Number(item?.applySubtotalPrice);
                }
              });
              setApplyTotalAmount(sum.toFixed(2)); //申请开票总金额含税
              setApplyMarginPrice(
                Number(Number(Number(sum) - Number(tableRowData?.totalAmount)).toFixed(2)),
              ); //申请价差
            }}
          />
        );
      },
    },
    {
      title: '面价',
      dataIndex: 'facePrice',
      width: 100,
      render: (_, record: any) => {
        record.facePrice = record.originaSubtotalPrice;
        if (record.sku === 'S00001') {
          return record.originaSubtotalPrice;
        } else {
          return record.facePrice;
        }
      },
    },
    { title: '销售单位', dataIndex: 'salesUnit', width: 100 },
    { title: '产品名称', dataIndex: 'productName', width: 100 },
    { title: '品牌', dataIndex: 'brandName', width: 100 },
    { title: '制造商型号', dataIndex: 'mfgSku', width: 100 },
    { title: '供应商型号', dataIndex: 'supplierNo', width: 260 },
    { title: '物理单位', dataIndex: 'physicsUnit', width: 100 },
    { title: '客户物料号', dataIndex: 'customerSku', width: 100 },
    { title: '客户需求行号', dataIndex: 'customerItemNo', width: 260 },
    {
      title: '是否JV',
      width: 100,
      render(_, record) {
        return <span>{record.jvFlag ? '是' : '否'}</span>;
      },
    },
    { title: 'JV公司', dataIndex: 'jvCompanyName', width: 260 },
  ];
  infoColumn.forEach((item: any) => {
    item.ellipsis = true;
  });
  const dbSaveVat = async (val: any) => {
    if (Object.values(val).length === 0) {
      message.error('请选择信息');
      return false;
    }
    setInfo({
      ...info,
      ...val,
    });
    form.setFieldsValue({
      ...val,
      vatCompanyName: val.invoiceTitle,
    });
    setModalVisibleInvice(false);
  };
  const getApplyList = (LoanApplyNo: any) => {
    queryLoanDetails(LoanApplyNo).then((res: any) => {
      const { data, errCode, errMsg } = res;
      if (errCode === 200) {
        if (
          data?.applyVo?.loanApplyType == 'EO1' ||
          data?.applyVo?.loanApplyType == 'EO3' ||
          data?.applyVo?.loanApplyType == 'EO4'
        ) {
          setApplyPriceHide(true);
        }
        if (data?.applyVo?.loanApplyType == 'EO3') {
          setSplitHide(false);
        } else {
          setSplitHide(true);
        }
        //编辑页面根据开票抬头判断是否可以从CRM选择开票信息
        if (data?.applyVo?.changeHeaderFlag == '1' && tableRowData?.readOnly == 0) {
          setInvoice(false);
        }
        setInfo(data);
        data.dataList = data?.dataList?.map((item: any, index: any) => {
          return {
            ...item,
            splitInvoiceNameIndex: index,
          };
        });
        setTableData(data?.lineList);
        setTableRowData(data?.applyVo);
        setChannelVal(data?.applyVo?.originalChannel);
        setUploadList(data?.resourceList);
        setApplyTotalAmount(data?.applyVo?.applyTotalAmount); //申请开票总金额含税
        setApplyMarginPrice(data?.applyVo?.applyMarginPrice); //申请价差
      } else {
        message.error(errMsg);
      }
    });
    getCompanyList().then((res: any) => {
      if (res?.errCode === 200) {
        setCpList(
          res?.data?.dataList?.map((io: any) => ({
            ...io,
            value: io.value,
            label: io.value,
          })),
        );
      }
    });
  };
  return (
    <div className="form-content-search" id="LoanApplyEdit">
      <ProForm
        layout="horizontal"
        className="fix_lable_large has-gridForm"
        onFinish={(values) => submit(values)}
        form={form}
        formRef={formRef}
        onFinishFailed={() => {
          if (btnType == 0) {
            return;
          } else if (btnType == 1) {
            message.warning('您有未完善的信息，请填写正确的信息');
          }
          setLoading(false);
        }}
        onValuesChange={(values) => {
          if (values?.contactName?.value) {
            setRowData({
              ...rowData,
              contactCodeR3: values?.contactName?.value,
            });
            form.setFieldsValue({
              contactCodeR3: values?.contactName?.value,
            });
          }
        }}
        submitter={{
          searchConfig: {},
          render: () => {
            return (
              <div
                style={{
                  position: 'fixed',
                  zIndex: 100,
                  bottom: '10px',
                  right: '10px',
                  height: '30px',
                  textAlign: 'end',
                  backgroundColor: '#fff',
                  paddingRight: '10px',
                }}
              >
                <Space>
                  {!allDisable && (
                    <>
                      <Button
                        type="primary"
                        // ghost={true}
                        htmlType="submit"
                        onClick={() => submit(0)}
                        loading={loading}
                      >
                        仅保存
                      </Button>
                      <Button
                        type="primary"
                        htmlType="submit"
                        loading={loading}
                        onClick={() => submit(1)}
                      >
                        提交审批
                      </Button>
                    </>
                  )}

                  <Button
                    onClick={() => {
                      resetFrom();
                      destroyCom('/to-loan/apply/index', location.pathname);
                    }}
                  >
                    取消
                  </Button>
                </Space>
              </div>
            );
          },
        }}
        initialValues={[]}
      >
        <Card className="head-title-wrap">
          <Row gutter={24}>
            <Col span={22} className="title">
              {type == 'edit' && <span>编辑借贷申请</span>}
            </Col>
          </Row>
          <Row gutter={24}>
            {type == 'detail' && (
              <>
                <Col span={22} className="title">
                  <span key={'借贷申请详情'}>借贷申请编号: {info?.applyVo?.loanApplyNo}</span>
                  <Tag key={'借贷申请状态'} color="gold" style={{ marginLeft: 10 }}>
                    {info?.applyVo?.loanApplyStatusName}
                  </Tag>
                </Col>
                <Col span={2}>
                  <Button
                    style={{ textAlign: 'right' }}
                    type="primary"
                    onClick={() => setIsUpload(true)}
                  >
                    追加附件{' '}
                  </Button>
                </Col>
              </>
            )}
          </Row>
          <Row gutter={24}>
            <Col span={5}>
              <span key={'借贷申请'}>借贷申请编号: {info?.applyVo?.loanApplyNo}</span>
            </Col>
          </Row>
          <Row gutter={24}>
            <Col span={5} style={{ color: 'red' }}>
              {type == 'edit' && <span>保存申请后，借贷类型将不可更改</span>}
            </Col>
          </Row>
        </Card>
        <div className="editContentCol">
          <Card title="申请内容" bordered={false} id="basic">
            {info?.applyVo && (
              <ApplicationContent
                formRef={form}
                allsDisable={allDisable}
                type="edit"
                info={info?.applyVo}
                applyDisabled={true}
                handlePriceHide={handlePriceHide}
                handleSplitHide={handleSplitHide}
                updateInvoice={updateInvoice}
              />
            )}
          </Card>

          <Card title="申请附件(必填)" bordered={false} className="order-msg " id="shopDetail">
            <ProTable<TableListItem>
              style={{ width: '70%' }}
              columns={fileColumns}
              bordered
              size="small"
              rowKey="resourceName"
              options={false}
              search={false}
              dateFormatter="string"
              dataSource={uploadList}
              tableAlertRender={false}
              rowSelection={{
                type: 'checkbox',
                selectedRowKeys: ids,
                onChange: (rowKeys, selectedRowKeys) => {
                  setIds(rowKeys);
                  setFileRowsData(selectedRowKeys);
                },
              }}
              headerTitle={
                <Space style={{ marginBottom: '6px' }}>
                  {!allDisable && (
                    <>
                      <Button type="primary" onClick={() => setModalVisibleUpload(true)}>
                        上传附件
                      </Button>
                      <Button onClick={delFile}>删除选中</Button>
                    </>
                  )}
                </Space>
              }
              pagination={false}
            />
            <Space style={{ color: '#999', marginTop: '15px' }}>
              <Row gutter={24}>
                <Col span={24}>
                  <p>附件说明：</p>
                </Col>
                <Col span={24}>
                  <p>
                    1.
                    更换抬头需提供：客户确认换抬头的邮件或PO附件，特殊抬头需提供开票资料以便核对（部分顺丰抬头）
                  </p>
                </Col>
                <Col span={24}>
                  <p>2. 金额调整需提供：正确的PO附件、调价明细（可在下方发票明细里填写）</p>
                </Col>
              </Row>
            </Space>
          </Card>
          <Card title="订单信息" bordered={false} id="orderInfo">
            {info?.applyVo?.orderNo && (
              <OrderInfo type="edit" formRef={form} info={info?.applyVo} />
            )}
          </Card>
          <Card title="开票信息" bordered={false} id="invoice">
            {info?.applyVo && (
              <InvoiceInfo
                allsDisable={allDisable}
                type="edit"
                formRef={form}
                invoiceDisabled={invoiceDisabled}
                onModal={() => {
                  if (
                    !invoiceDisabled &&
                    form.getFieldsValue().changeHeaderFlag == 1 &&
                    tableRowData?.readOnly == 0
                  ) {
                    setModalVisibleInvice(true);
                    setInvoiceList([]);
                  }
                }}
                info={info?.applyVo}
              />
            )}
          </Card>
          <Card title="发票寄送信息" bordered={false} id="invoiceDeliver">
            {info?.applyVo && (
              <InvoiceDeliverInfo
                allsDisable={allDisable}
                type="edit"
                formRef={form}
                info={info?.applyVo}
                onModal={() => {
                  if (tableRowData?.readOnly == 0) {
                    setModalVisibleAddressInvoice(true);
                    setAddressList([]);
                  }
                }}
              />
            )}
          </Card>

          <Card title="发票明细">
            <Row gutter={24} style={{ marginBottom: '-25px' }}>
              <Col span={6}>
                {!splitHide && (
                  <>
                    <Button
                      type="primary"
                      disabled={allDisable}
                      onClick={() => {
                        if (!LoanApplyNo) {
                          message.error('系统发票号不能为空');
                          return;
                        }
                        invoiceDetailLoan(LoanApplyNo).then((res: any) => {
                          const { data, errCode, errMsg } = res;
                          if (errCode === 200) {
                            setSplitVisible(true);
                            setSplitInfo(data);
                          } else {
                            message.error(errMsg);
                          }
                        });
                      }}
                    >
                      拆开发票
                    </Button>
                    <Button
                      style={{ marginLeft: '15px' }}
                      type="primary"
                      onClick={() => {
                        if (!LoanApplyNo) {
                          message.error('系统发票号不能为空');
                          return;
                        }
                        invoicePreviewLoan(LoanApplyNo).then((res: any) => {
                          const { data, errCode, errMsg } = res;
                          if (errCode === 200) {
                            setSplitPreview(data.dataList);
                            setInvoicePreview(true);
                          } else {
                            message.error(errMsg);
                          }
                        });
                      }}
                    >
                      发票预览
                    </Button>
                  </>
                )}
              </Col>
            </Row>
            <div className="Detail">
              <table className="amountTable" cellSpacing="0" data-content="币种：CNY">
                <tbody>
                  <tr>
                    <th>原开票总金额含税:</th>
                    <td>{tableRowData?.totalAmount}</td>
                    {/* <th>申请开票总金额含税:</th>
                    <td>{tableRowData?.applyTotalAmount}</td>
                    <th>申请价差:</th>
                    <td>{tableRowData?.applyMarginPrice}</td> */}
                    <th>申请开票总金额含税:</th>
                    <td>{getApplyTotalAmount}</td>
                    <th>申请价差:</th>
                    <td>{getApplyMarginPrice}</td>
                  </tr>
                </tbody>
              </table>
              <div className="detail_table_mod" style={{ marginTop: '10px' }}>
                <ProTable<any>
                  scroll={{ x: 100, y: 500 }}
                  columns={infoColumn}
                  dataSource={tableData}
                  rowKey="invoiceNameIndex"
                  search={false}
                  toolBarRender={false}
                  tableAlertRender={false}
                  defaultSize="small"
                  actionRef={loanRef}
                />
              </div>
            </div>
          </Card>
        </div>
      </ProForm>

      {/* 详情 */}
      <Modal
        width={1200}
        key={'split'}
        title="拆分发票 "
        visible={splitVisible}
        onOk={handleOk}
        onCancel={handleCancel}
        destroyOnClose={true}
      >
        <SplitInvoice
          channelVal={channelVal}
          ref={SplitInvoiceRef}
          leftTable={leftTable}
          setleftTable={setleftTable}
          splitInfo={splitInfo}
          tabHandle={setTabInfo}
        />
      </Modal>
      {/* 拆分预览 */}
      <Modal
        width={1500}
        key={'preview'}
        title="拆分预览"
        visible={previewVisible}
        onOk={handlePreview}
        onCancel={CancelPreview}
      >
        <InvoicePreview splitPreview={splitPreview} />
      </Modal>
      {/* upload */}
      <ModalForm
        title={<Dtitle title="附件上传" subTitle="附件上限100个，单个文件不得超过100M" />}
        width={1100}
        visible={modalVisibleUpload}
        onVisibleChange={setModalVisibleUpload}
        modalProps={{ destroyOnClose: true }}
        submitter={{
          searchConfig: {
            submitText: '确认',
            resetText: '取消',
          },
        }}
        onFinish={async () => {
          setUploadList(tempList.concat(uploadList));
          setTempList([]);
          setIds([]);
          return true;
        }}
      >
        <UploadFile showList={showList} />
      </ModalForm>
      {/* 开票地址选择  */}
      <ModalForm
        title="地址选择"
        layout="horizontal"
        width={1100}
        modalProps={{ destroyOnClose: true }}
        visible={modalVisibleAddressInvoice}
        onVisibleChange={setModalVisibleAddressInvoice}
        submitter={{
          searchConfig: {
            submitText: '选择',
            resetText: '取消',
          },
        }}
        onFinish={async () => {
          if (Object.values(addressList).length === 0) {
            message.error('请选择信息');
            return false;
          }
          const invoiceAdd = {
            invoiceReceiver: addressList.recipientName,
            invoiceAddress: addressList.receiptAddress,
            invoiceZip: addressList.receiptZipCode,
            invoiceTel: addressList.receiptFixPhone,
            invoiceMobile: addressList.receiptMobilePhone,
            invoiceEmail: addressList.receiptEmail,
            invoiceReceiveRegion: `${addressList.provinceName}${addressList.cityName}${addressList.districtName}`,
            followMerchandise: addressList.followMerchandise == true ? 1 : 0,
            invoiceSapCode: addressList?.invoiceSapCode,
          };

          setInfo({
            ...info,
            invoiceInfo: {
              ...info.invoiceInfo,
              ...invoiceAdd,
            },
          });
          form.setFieldsValue({
            ...invoiceAdd,
          });
          return true;
        }}
      >
        <SearchAddressInvoice
          customerCode={info?.applyVo?.customerCode}
          onDbSave={(record) => setAddressList(record)}
          onSelect={(record) => setAddressList(record)}
        />
      </ModalForm>
      {/* 选择开票信息 */}
      <ModalForm
        title="选择开票信息"
        layout="horizontal"
        width={1100}
        modalProps={{ destroyOnClose: true }}
        visible={modalVisibleInvice}
        onVisibleChange={setModalVisibleInvice}
        submitter={{
          searchConfig: {
            submitText: '选择',
            resetText: '取消',
          },
        }}
        onFinish={async (values) => {
          console.log(values);
          if (Object.values(invoiceList).length === 0) {
            message.error('请选择信息');
            return false;
          }
          form.setFieldsValue({
            ...invoiceList,
            vatCompanyName: invoiceList.invoiceTitle,
          });
          const tInvoice = {
            ...invoiceList,
          };
          setInfo({
            ...info,
            invoiceInfo: {
              ...info.invoiceInfo,
              ...tInvoice,
            },
          });

          return true;
        }}
      >
        <SearchInvoice
          customerCode={info?.applyVo?.customerCode}
          onDbSave={(record) => dbSaveVat(record)}
          onSelect={(record) => setInvoiceList(record)}
        />
      </ModalForm>
      <UploadForm visible={isUpload} getList={loadList} maxCount={100} />
    </div>
  );
};
export default Edit;
// import { KeepAlive } from 'react-activation';

// export default () => (
//   <KeepAlive name={location.pathname} saveScrollPosition="screen">
//     <Add />
//   </KeepAlive>
// );
