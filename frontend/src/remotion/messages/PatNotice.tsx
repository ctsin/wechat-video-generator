// 「拍了拍」居中灰字提示。
export const PatNotice: React.FC<{ content: string }> = ({ content }) => {
  return (
    <div
      style={{
        textAlign: 'center',
        color: '#888888',
        fontSize: 22,
        lineHeight: '30px',
        padding: '4px 0',
      }}
    >
      {content}
    </div>
  );
};
