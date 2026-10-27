import useTitle from '../useTitle';
import LuxuryEnhancements from '../LuxuryEnhancements';
import AfsanaSignatureHome from '../AfsanaSignatureHome';

export default function HomePage(){
  useTitle('AFSANA — The Art of Scent');
  return <><LuxuryEnhancements/><div data-afsana-home><AfsanaSignatureHome/></div></>;
}
