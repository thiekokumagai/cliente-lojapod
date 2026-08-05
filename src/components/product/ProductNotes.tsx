interface ProductNotesProps {
  note: string;
  placeholder: string;
  isDesktop?: boolean;
  isNicSalt?: boolean;
  onChange: (value: string) => void;
}

const ProductNotes = ({
  note,
  placeholder,
  isDesktop = false,
  isNicSalt = false,
  onChange,
}: ProductNotesProps) => {
  return (
    <div className={isDesktop ? "mt-6 border-t border-[#ececec] pt-5" : "mt-6 border-t border-[#ececec] pt-5"}>
      <textarea
        value={note}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={
          isDesktop
            ? `w-full bg-[#f3f2f2] p-4 text-sm text-foreground placeholder:text-[#b6b6b6] focus:outline-none ${
                isNicSalt ? "min-h-[92px] rounded-2xl" : "min-h-[106px] rounded-lg"
              }`
            : "min-h-[72px] w-full rounded-2xl bg-[#f3f2f2] p-4 text-base text-foreground placeholder:text-[#b6b6b6] focus:outline-none md:text-sm"
        }
      />
    </div>
  );
};

export default ProductNotes;
