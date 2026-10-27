import useTitle from '../useTitle';
import AfsanaSignatureHome from '../AfsanaSignatureHome';

export default function HomePage(){
  useTitle('AFSANA — The Art of Scent');
  return <div data-afsana-home><AfsanaSignatureHome/></div>;
}
